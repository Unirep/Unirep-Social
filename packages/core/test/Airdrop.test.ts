// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { deployUnirep } from '@unirep/contracts/deploy'
import { Identity } from '@semaphore-protocol/identity'
import { genEpochKey } from '@unirep/utils'
import { deployUnirepSocial, Unirep, UnirepSocial } from '../deploy'
import { genUserState } from './utils'
import { defaultEpochLength } from '../src/config'
import { EpochKeyProof } from '@unirep/circuits'

describe('Subsidy Airdrop', function () {
    this.timeout(1000000)
    let unirepContract: Unirep
    let unirepSocialContract: UnirepSocial
    let admin
    let attesterId
    let chainId
    const id = new Identity()

    const epkNonce = 0
    const revealNonce = true
    const downvote = 20

    before(async () => {
        const accounts = await ethers.getSigners()
        admin = accounts[0]
        const network = await accounts[0].provider.getNetwork()
        chainId = network.chainId

        unirepContract = await deployUnirep(admin)
        unirepSocialContract = await deployUnirepSocial(
            admin,
            unirepContract.address
        )
        attesterId = unirepSocialContract.address
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        // user sign up
        {
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()

            await unirepSocialContract
                .connect(admin)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }
        // user 1 epoch key
        const epoch = await unirepContract.attesterCurrentEpoch(attesterId)
        const nonce = 0
        const epochKey = genEpochKey(
            id.secret,
            attesterId,
            epoch,
            nonce,
            chainId
        )

        // sign up another user and vote
        {
            const id2 = new Identity()
            const userState2 = await genUserState(
                ethers.provider,
                unirepContract.address,
                id2,
                attesterId
            )
            const { publicSignals, proof } =
                await userState2.genUserSignUpProof()

            await unirepSocialContract
                .connect(admin)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
            await userState2.waitForSync()

            const voteProof = await userState2.genActionProof({
                revealNonce: true,
                notEpochKey: epochKey,
            })

            const upvote = 0
            await unirepSocialContract
                .connect(admin)
                .voteSubsidy(
                    upvote,
                    downvote,
                    epochKey,
                    voteProof.publicSignals,
                    voteProof.proof
                )
                .then((t) => t.wait())
            userState2.stop()
        }

        // epoch transition
        await ethers.provider.send('evm_increaseTime', [defaultEpochLength])
        await ethers.provider.send('evm_mine', [])

        // user state transition
        {
            await userState.waitForSync()
            const toEpoch = await unirepContract.attesterCurrentEpoch(
                attesterId
            )
            const { publicSignals, proof } =
                await userState.genUserStateTransitionProof({ toEpoch })
            await unirepContract
                .connect(admin)
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }
        userState.stop()
    })

    {
        let snapshot

        beforeEach(async () => {
            snapshot = await ethers.provider.send('evm_snapshot', [])
        })

        afterEach(async () => {
            await ethers.provider.send('evm_revert', [snapshot])
        })
    }

    it('reputation proof should be verified valid off-chain and on-chain', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )

        const proof = await userState.genActionProof({
            maxRep: downvote,
        })
        const isValid = await proof.verify()
        expect(isValid).to.be.true
        expect(proof.proveMaxRep).to.equal('1')
        expect(proof.maxRep).to.equal(downvote.toString())

        const isProofValid = await unirepSocialContract.verifyActionProof(
            proof.publicSignals,
            proof.proof
        )
        expect(isProofValid).to.be.true
    })

    it('submit airdrop subsidy should succeed', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof, epoch, epochKey } =
            await userState.genActionProof({
                maxRep: downvote,
                revealNonce,
                epkNonce,
            })
        const tx = await unirepSocialContract.getSubsidyAirdrop(
            publicSignals,
            proof
        )
        const posRepField = await unirepSocialContract.posRepFieldIndex()
        await expect(tx)
            .to.emit(unirepContract, 'Attestation')
            .withArgs(epoch, epochKey, attesterId, posRepField, downvote)
        userState.stop()
    })

    it('submit airdrop subsidy without revealing epoch key nonce should fail', async () => {
        const falseReveal = false
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            maxRep: downvote,
            epkNonce,
            revealNonce: falseReveal,
        })
        await expect(
            unirepSocialContract.getSubsidyAirdrop(publicSignals, proof)
        ).to.be.revertedWith('Unirep Social: epoch key nonce is not valid')
        userState.stop()
    })

    it('submit airdrop subsidy with wrong epoch key nonce should fail', async () => {
        const wrongNonce = 2
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            maxRep: downvote,
            epkNonce: wrongNonce,
            revealNonce,
        })
        await expect(
            unirepSocialContract.getSubsidyAirdrop(publicSignals, proof)
        ).to.be.revertedWith('Unirep Social: epoch key nonce is not valid')
        userState.stop()
    })

    it('submit airdrop subsidy without prove max rep flag should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof, proveMaxRep } =
            await userState.genActionProof({
                epkNonce,
                revealNonce,
            })
        expect(proveMaxRep).to.equal('0')
        await expect(
            unirepSocialContract.getSubsidyAirdrop(publicSignals, proof)
        ).to.be.revertedWith('Unirep Social: should prove max reputation')
        userState.stop()
    })

    it('submit airdrop subsidy with the same proof should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            maxRep: downvote,
            epkNonce,
            revealNonce,
        })
        await unirepSocialContract
            .getSubsidyAirdrop(publicSignals, proof)
            .then((t) => t.wait())
        await expect(
            unirepSocialContract.getSubsidyAirdrop(publicSignals, proof)
        ).to.be.revertedWith('Unirep Social: the proof is submitted before')
        userState.stop()
    })

    it('submit airdrop subsidy with the invalid proof should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals } = await userState.genActionProof({
            maxRep: downvote,
            epkNonce,
            revealNonce,
        })
        const proof = Array(8).fill(0)
        await expect(
            unirepSocialContract.getSubsidyAirdrop(publicSignals, proof)
        ).to.be.revertedWith('Unirep Social: proof is invalid')
        userState.stop()
    })

    it('submit airdrop subsidy with the invalid state tree root should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof, idx } = await userState.genActionProof({
            maxRep: downvote,
            epkNonce,
            revealNonce,
        })
        publicSignals[idx.stateTreeRoot] = BigInt(1234)
        await expect(
            unirepSocialContract.getSubsidyAirdrop(publicSignals, proof)
        ).to.be.revertedWith('Unirep Social: GST root does not exist in epoch')
        userState.stop()
    })

    it('submit airdrop subsidy with the wrong epoch should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const wrongEpoch = BigInt(0)
        const proof = await userState.genActionProof({
            maxRep: downvote,
            epkNonce,
            revealNonce,
        })
        const stateTree = await userState.sync.genStateTree(wrongEpoch)
        const wrongEpochControl = EpochKeyProof.buildControl({
            attesterId: BigInt(unirepSocialContract.address),
            epoch: wrongEpoch,
            nonce: BigInt(epkNonce),
            revealNonce: BigInt(revealNonce),
            chainId: BigInt(chainId),
        })
        proof.publicSignals[proof.idx.stateTreeRoot] = stateTree.root.toString()
        proof.publicSignals[proof.idx.control0] = wrongEpochControl
        await expect(
            unirepSocialContract.getSubsidyAirdrop(
                proof.publicSignals,
                proof.proof
            )
        ).to.be.revertedWith('Unirep Social: epoch mismatches')
        userState.stop()
    })

    it('submit post subsidy with the wrong attester ID should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const proof = await userState.genActionProof({
            epkNonce,
            revealNonce,
        })

        const wrongControl = EpochKeyProof.buildControl({
            attesterId: BigInt(1234),
            epoch: proof.epoch,
            nonce: BigInt(epkNonce),
            revealNonce: BigInt(revealNonce),
            chainId: BigInt(chainId),
        })
        proof.publicSignals[proof.idx.control0] = wrongControl
        await expect(
            unirepSocialContract.getSubsidyAirdrop(
                proof.publicSignals,
                proof.proof
            )
        ).to.be.revertedWith('Unirep Social: attesterId mismatches')
        userState.stop()
    })

    it('requesting airdrop subsidy twice should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        // submit first time
        {
            const { publicSignals, proof, epoch, epochKey } =
                await userState.genActionProof({
                    maxRep: downvote,
                    epkNonce,
                    revealNonce,
                })
            await unirepSocialContract
                .getSubsidyAirdrop(publicSignals, proof)
                .then((t) => t.wait())
            const subsidy = await unirepSocialContract.subsidy()
            const used = await unirepSocialContract.subsidies(epoch, epochKey)
            expect(used.toString()).to.equal(subsidy.toString())
        }
        // submit second time with different proof
        {
            const { publicSignals, proof } = await userState.genActionProof({
                maxRep: downvote,
                epkNonce,
                revealNonce,
            })
            await expect(
                unirepSocialContract.getSubsidyAirdrop(publicSignals, proof)
            ).to.be.revertedWith('Unirep Social: requesting too much subsidy')
        }
        userState.stop()
    })
})
