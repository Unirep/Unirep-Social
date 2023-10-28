// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { deployUnirep } from '@unirep/contracts/deploy'
import { genEpochKey } from '@unirep/utils'
import { Identity } from '@semaphore-protocol/identity'
import { deployUnirepSocial, Unirep, UnirepSocial } from '../deploy'
import { genUserState } from './utils'
import { defaultEpochLength } from '../src/config'
import { EpochKeyProof } from '@unirep/circuits'

describe('Post', function () {
    this.timeout(1000000)
    let unirepContract: Unirep
    let unirepSocialContract: UnirepSocial
    let admin
    let attesterId
    let chainId
    const id = new Identity()
    const content = 'some post text'
    const hashedContent = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(content)
    )
    let postReputation
    const postId = 1
    const epkNonce = 0
    const revealNonce = true

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
        postReputation = (
            await unirepSocialContract.postReputation()
        ).toNumber()
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
                epkNonce: 0,
                notEpochKey: epochKey,
            })

            const upvote = 30
            const downvote = 0
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

        const epkNonce = 0
        const proof = await userState.genActionProof({
            epkNonce,
            spentRep: postReputation,
        })
        const isValid = await proof.verify()
        expect(isValid).to.be.true

        const isProofValid = await unirepSocialContract.verifyActionProof(
            proof.publicSignals,
            proof.proof
        )
        expect(isProofValid).to.be.true
    })

    it('submit post should succeed', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof, epoch, epochKey } =
            await userState.genActionProof({ spentRep: postReputation })
        const tx = await unirepSocialContract.publishPost(
            hashedContent,
            publicSignals,
            proof
        )
        await expect(tx)
            .to.emit(unirepSocialContract, 'PostSubmitted')
            .withArgs(epoch, postId, epochKey, hashedContent, 0)
        userState.stop()
    })

    it('submit post with min rep should succeed', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const minRep = 10
        const { publicSignals, proof, epoch, epochKey, proveMinRep } =
            await userState.genActionProof({ spentRep: postReputation, minRep })
        const tx = await unirepSocialContract.publishPost(
            hashedContent,
            publicSignals,
            proof
        )
        expect(proveMinRep).to.equal('1')
        await expect(tx)
            .to.emit(unirepSocialContract, 'PostSubmitted')
            .withArgs(epoch, postId, epochKey, hashedContent, minRep)
        userState.stop()
    })

    it('submit post with different amount of nullifiers should fail', async () => {
        const spentRep = 3
        expect(spentRep).not.equal(postReputation)
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            spentRep,
        })
        await expect(
            unirepSocialContract.publishPost(
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: invalid rep nullifier')
        userState.stop()
    })

    it('submit post with the same proof should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            spentRep: postReputation,
        })
        await unirepSocialContract
            .publishPost(hashedContent, publicSignals, proof)
            .then((t) => t.wait())
        await expect(
            unirepSocialContract.publishPost(
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: the proof is submitted before')
        userState.stop()
    })

    it('submit post with the invalid proof should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals } = await userState.genActionProof({
            spentRep: postReputation,
        })
        const proof = Array(8).fill(0)
        await expect(
            unirepSocialContract.publishPost(
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: proof is invalid')
        userState.stop()
    })

    it('submit post with the invalid state tree root should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof, idx } = await userState.genActionProof({
            spentRep: postReputation,
        })
        publicSignals[idx.stateTreeRoot.toString()] = '1234'
        await expect(
            unirepSocialContract.publishPost(
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: GST root does not exist in epoch')
        userState.stop()
    })

    it('submit post with the wrong epoch should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const wrongEpoch = 0
        const proof = await userState.genActionProof({
            spentRep: postReputation,
        })
        const stateTree = await userState.sync.genStateTree(wrongEpoch)
        const wrongEpochControl = EpochKeyProof.buildControl({
            attesterId: BigInt(unirepSocialContract.address),
            epoch: BigInt(wrongEpoch),
            nonce: BigInt(0),
            revealNonce: BigInt(0),
            chainId: BigInt(chainId),
        })
        proof.publicSignals[proof.idx.stateTreeRoot] = stateTree.root.toString()
        proof.publicSignals[proof.idx.control0] = wrongEpochControl
        await expect(
            unirepSocialContract.publishPost(
                hashedContent,
                proof.publicSignals,
                proof.proof
            )
        ).to.be.revertedWith('Unirep Social: epoch mismatches')
        userState.stop()
    })

    it('submit post with the wrong attester ID should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const proof = await userState.genActionProof({
            spentRep: postReputation,
        })

        const wrongControl = EpochKeyProof.buildControl({
            attesterId: BigInt(1234),
            epoch: proof.epoch,
            nonce: BigInt(0),
            revealNonce: BigInt(0),
            chainId: BigInt(chainId),
        })
        proof.publicSignals[proof.idx.control0] = wrongControl
        await expect(
            unirepSocialContract.publishPost(
                hashedContent,
                proof.publicSignals,
                proof.proof
            )
        ).to.be.revertedWith('Unirep Social: attesterId mismatches')
        userState.stop()
    })

    it('subsidy proof should be verified valid off-chain and on-chain', async () => {
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
        const isValid = await proof.verify()
        expect(isValid).to.be.true

        const isProofValid = await unirepSocialContract.verifyActionProof(
            proof.publicSignals,
            proof.proof
        )
        expect(isProofValid).to.be.true
    })

    it('submit post subsidy should succeed', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const minRep = 0
        const { publicSignals, proof, epoch, epochKey } =
            await userState.genActionProof({ epkNonce, revealNonce })
        const tx = await unirepSocialContract.publishPostSubsidy(
            hashedContent,
            publicSignals,
            proof
        )
        await expect(tx)
            .to.emit(unirepSocialContract, 'PostSubmitted')
            .withArgs(epoch, postId, epochKey, hashedContent, minRep)
        userState.stop()
    })

    it('submit post subsidy with min rep should succeed', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const minRep = 10
        const { publicSignals, proof, epoch, epochKey, proveMinRep } =
            await userState.genActionProof({ minRep, revealNonce, epkNonce })
        const tx = await unirepSocialContract.publishPostSubsidy(
            hashedContent,
            publicSignals,
            proof
        )
        expect(proveMinRep).to.equal('1')
        await expect(tx)
            .to.emit(unirepSocialContract, 'PostSubmitted')
            .withArgs(epoch, postId, epochKey, hashedContent, minRep)
        userState.stop()
    })

    it('submit post subsidy without revealing epoch key nonce should fail', async () => {
        const falseReveal = false
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            epkNonce,
            revealNonce: falseReveal,
        })
        await expect(
            unirepSocialContract.publishPostSubsidy(
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: epoch key nonce is not valid')
        userState.stop()
    })

    it('submit post subsidy with wrong epoch key nonce should fail', async () => {
        const wrongNonce = 2
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            epkNonce: wrongNonce,
            revealNonce,
        })
        await expect(
            unirepSocialContract.publishPostSubsidy(
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: epoch key nonce is not valid')
        userState.stop()
    })

    it('submit post subsidy with the same proof should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            epkNonce,
            revealNonce,
        })
        await unirepSocialContract
            .publishPostSubsidy(hashedContent, publicSignals, proof)
            .then((t) => t.wait())
        await expect(
            unirepSocialContract.publishPostSubsidy(
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: the proof is submitted before')
        userState.stop()
    })

    it('submit post subsidy with the invalid proof should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals } = await userState.genActionProof({
            epkNonce,
            revealNonce,
        })
        const proof = Array(8).fill(0)
        await expect(
            unirepSocialContract.publishPostSubsidy(
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: proof is invalid')
        userState.stop()
    })

    it('submit post subsidy with the invalid state tree root should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof, idx } = await userState.genActionProof({
            epkNonce,
            revealNonce,
        })
        publicSignals[idx.stateTreeRoot.toString()] = '1234'
        await expect(
            unirepSocialContract.publishPostSubsidy(
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: GST root does not exist in epoch')
        userState.stop()
    })

    it('submit post subsidy with the wrong epoch should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const wrongEpoch = 0
        const proof = await userState.genActionProof({
            epkNonce,
            revealNonce,
        })
        const stateTree = await userState.sync.genStateTree(wrongEpoch)
        const wrongEpochControl = EpochKeyProof.buildControl({
            attesterId: BigInt(unirepSocialContract.address),
            epoch: BigInt(wrongEpoch),
            nonce: BigInt(epkNonce),
            revealNonce: BigInt(revealNonce),
            chainId: BigInt(chainId),
        })
        proof.publicSignals[proof.idx.stateTreeRoot] = stateTree.root.toString()
        proof.publicSignals[proof.idx.control0] = wrongEpochControl
        await expect(
            unirepSocialContract.publishPostSubsidy(
                hashedContent,
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
            unirepSocialContract.publishPostSubsidy(
                hashedContent,
                proof.publicSignals,
                proof.proof
            )
        ).to.be.revertedWith('Unirep Social: attesterId mismatches')
        userState.stop()
    })

    it('requesting too much subsidy should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const subsidy = await unirepSocialContract.subsidy()
        const postReputation = await unirepSocialContract.postReputation()
        const iterations = subsidy.toNumber() / postReputation.toNumber()
        for (let i = 0; i < iterations; i++) {
            const { publicSignals, proof } = await userState.genActionProof({
                epkNonce,
                revealNonce,
            })
            await unirepSocialContract
                .publishPostSubsidy(hashedContent, publicSignals, proof)
                .then((t) => t.wait())
        }
        const { publicSignals, proof } = await userState.genActionProof({
            epkNonce,
            revealNonce,
        })
        await expect(
            unirepSocialContract.publishPostSubsidy(
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: requesting too much subsidy')
        userState.stop()
    })
})
