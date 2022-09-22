// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ZkIdentity } from '@unirep/crypto'
import { genEpochKey } from '@unirep/core'
import { genUserState } from './utils'
import { deployUnirep } from '@unirep/contracts/deploy'
import { deployUnirepSocial } from '../src/utils'
import * as config from '@unirep/circuits'

describe('Subsidy', function () {
    this.timeout(1000000)
    let unirepContract, unirepSocialContract
    const attestingFee = ethers.utils.parseEther('0.001')

    before(async () => {
        const accounts = await ethers.getSigners()
        const settings = {
            maxUsers: config.MAX_USERS,
            maxAttesters: config.MAX_ATTESTERS,
            numEpochKeyNoncePerEpoch: config.NUM_EPOCH_KEY_NONCE_PER_EPOCH,
            maxReputationBudget: config.MAX_REPUTATION_BUDGET,
            epochLength: config.EPOCH_LENGTH,
            attestingFee: attestingFee,
        }
        unirepContract = await deployUnirep(accounts[0], settings)
        unirepSocialContract = await deployUnirepSocial(
            accounts[0],
            unirepContract.address
        )
    })

    it('should create a post using subsidy', async () => {
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        await unirepSocialContract
            .connect(accounts[0])
            .userSignUp(id.genIdentityCommitment())
            .then((t) => t.wait())
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id
        )
        const attesterId = await unirepContract.attesters(
            unirepSocialContract.address
        )
        const subsidyProof = await userState.genSubsidyProof(
            attesterId.toBigInt()
        )
        expect(await subsidyProof.verify()).to.be.true
        // now create a post
        const text = 'test post'
        const contentHash = ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(text)
        )
        await unirepSocialContract
            .connect(accounts[0])
            .publishPostSubsidy(
                contentHash,
                subsidyProof.publicSignals,
                subsidyProof.proof,
                {
                    value: attestingFee,
                }
            )
            .then((t) => t.wait())
        await userState.stop()
    })

    it('should create a comment using subsidy', async () => {
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        await unirepSocialContract
            .connect(accounts[0])
            .userSignUp(id.genIdentityCommitment())
            .then((t) => t.wait())
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id
        )
        const attesterId = await unirepContract.attesters(
            unirepSocialContract.address
        )
        const subsidyProof = await userState.genSubsidyProof(
            attesterId.toBigInt()
        )
        expect(await subsidyProof.verify()).to.be.true
        // now create a post
        const text = 'test comment'
        const contentHash = ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(text)
        )
        await unirepSocialContract
            .connect(accounts[0])
            .publishCommentSubsidy(
                '0x000001', // dummy post id
                contentHash,
                subsidyProof.publicSignals,
                subsidyProof.proof,
                {
                    value: attestingFee,
                }
            )
            .then((t) => t.wait())
        await userState.stop()
    })

    it('should create a vote using subsidy', async () => {
        const accounts = await ethers.getSigners()
        const attesterId = await unirepContract.attesters(
            unirepSocialContract.address
        )
        const receivingId = new ZkIdentity()
        // now create a vote
        const id = new ZkIdentity()
        await unirepSocialContract
            .connect(accounts[0])
            .userSignUp(id.genIdentityCommitment())
            .then((t) => t.wait())
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id
        )
        const epoch = await unirepContract.currentEpoch()
        const toEpochKey = genEpochKey(
            receivingId.identityNullifier,
            epoch.toNumber(),
            0
        )
        const subsidyProof = await userState.genSubsidyProof(
            attesterId.toBigInt(),
            BigInt(0),
            toEpochKey
        )
        expect(await subsidyProof.verify()).to.be.true
        const voteAmount = 3
        const tx = await unirepSocialContract
            .connect(accounts[1])
            .voteSubsidy(
                voteAmount,
                0,
                toEpochKey,
                subsidyProof.publicSignals,
                subsidyProof.proof,
                {
                    value: attestingFee.mul(2),
                }
            )
        expect(tx)
            .to.emit(unirepContract, 'AttestationSubmitted')
            .withArgs(epoch, toEpochKey, unirepSocialContract.address, [
                BigInt(voteAmount),
                BigInt(0),
                BigInt(0),
                BigInt(0),
                BigInt(0),
            ])
        expect(tx)
            .to.emit(unirepSocialContract, 'VoteSubmitted')
            .withArgs(
                epoch,
                subsidyProof.publicSignals[1],
                toEpochKey,
                voteAmount,
                0,
                subsidyProof.publicSignals[4]
            )
        await tx.wait()
        await userState.stop()
    })

    it('should fail to spend more than the subsidy', async () => {
        const accounts = await ethers.getSigners()
        const attesterId = await unirepContract.attesters(
            unirepSocialContract.address
        )
        const epkSubsidy = (await unirepSocialContract.subsidy()).toNumber()
        const id = new ZkIdentity()
        await unirepSocialContract
            .connect(accounts[0])
            .userSignUp(id.genIdentityCommitment())
            .then((t) => t.wait())
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id
        )
        const toEpochKey = '0x000001'
        const subsidyProof = await userState.genSubsidyProof(
            attesterId.toBigInt(),
            BigInt(0),
            BigInt(toEpochKey)
        )
        expect(await subsidyProof.verify()).to.be.true
        await expect(
            unirepSocialContract
                .connect(accounts[1])
                .voteSubsidy(
                    epkSubsidy + 1,
                    0,
                    toEpochKey,
                    subsidyProof.publicSignals,
                    subsidyProof.proof,
                    {
                        value: attestingFee.mul(2),
                    }
                )
        ).to.be.revertedWith('Unirep Social: requesting too much subsidy')
        await userState.stop()
    })

    it('should fail to vote for self with subsidy', async () => {
        const accounts = await ethers.getSigners()
        const attesterId = await unirepContract.attesters(
            unirepSocialContract.address
        )
        const receivingId = new ZkIdentity()
        // now create a vote
        const id = new ZkIdentity()
        await unirepSocialContract
            .connect(accounts[0])
            .userSignUp(id.genIdentityCommitment())
            .then((t) => t.wait())
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id
        )
        const subsidyProof = await userState.genSubsidyProof(
            attesterId.toBigInt()
        )
        expect(await subsidyProof.verify()).to.be.true
        const epoch = await unirepContract.currentEpoch()
        const toEpochKey = genEpochKey(
            receivingId.identityNullifier,
            epoch.toNumber(),
            0
        )
        await expect(
            unirepSocialContract
                .connect(accounts[1])
                .voteSubsidy(
                    3,
                    0,
                    toEpochKey,
                    subsidyProof.publicSignals,
                    subsidyProof.proof,
                    {
                        value: attestingFee.mul(2),
                    }
                )
        ).to.be.revertedWith('Unirep Social: must prove non-ownership of epk')
        await userState.stop()
    })

    it('should claim neg rep airdrop', async () => {
        const accounts = await ethers.getSigners()
        const attesterId = await unirepContract.attesters(
            unirepSocialContract.address
        )
        const voteAmount = 10
        const receivingId = new ZkIdentity()
        {
            // now create a vote
            const id = new ZkIdentity()
            await unirepSocialContract
                .connect(accounts[0])
                .userSignUp(id.genIdentityCommitment())
                .then((t) => t.wait())
            await unirepSocialContract
                .connect(accounts[0])
                .userSignUp(receivingId.genIdentityCommitment())
                .then((t) => t.wait())
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                id
            )
            const epoch = await unirepContract.currentEpoch()
            const toEpochKey = genEpochKey(
                receivingId.identityNullifier,
                epoch.toNumber(),
                0
            )
            const subsidyProof = await userState.genSubsidyProof(
                attesterId.toBigInt(),
                BigInt(0),
                toEpochKey
            )
            expect(await subsidyProof.verify()).to.be.true
            await unirepSocialContract
                .connect(accounts[1])
                .voteSubsidy(
                    0,
                    voteAmount,
                    toEpochKey,
                    subsidyProof.publicSignals,
                    subsidyProof.proof,
                    {
                        value: attestingFee.mul(2),
                    }
                )
                .then((t) => t.wait())
            await userState.stop()
        }
        // now do a UST
        await ethers.provider.send('evm_increaseTime', [config.EPOCH_LENGTH])
        await unirepContract
            .connect(accounts[0])
            .beginEpochTransition()
            .then((t) => t.wait())
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            receivingId
        )
        const {
            startTransitionProof,
            processAttestationProofs,
            finalTransitionProof,
        } = await userState.genUserStateTransitionProofs()
        await unirepSocialContract
            .startUserStateTransition(
                startTransitionProof.publicSignals,
                startTransitionProof.proof
            )
            .then((t) => t.wait())
        for (const p of processAttestationProofs) {
            await unirepSocialContract
                .processAttestations(p.publicSignals, p.proof)
                .then((t) => t.wait())
        }
        await unirepContract
            .updateUserStateRoot(
                finalTransitionProof.publicSignals,
                finalTransitionProof.proof
            )
            .then((t) => t.wait())
        await userState.waitForSync()
        // should now have -10 rep
        {
            const proof = await userState.genNegativeRepProof(
                attesterId.toBigInt(),
                BigInt(voteAmount + 1)
            )
            const isValid = await proof.verify()
            expect(isValid).to.be.false
        }
        const negRepProof = await userState.genNegativeRepProof(
            attesterId.toBigInt(),
            BigInt(10)
        )
        const epoch = await unirepContract.currentEpoch()
        const tx = await unirepSocialContract
            .connect(accounts[0])
            .getSubsidyAirdrop(negRepProof.publicSignals, negRepProof.proof)
        expect(tx)
            .to.emit(unirepContract, 'AttestationSubmitted')
            .withArgs(
                epoch,
                negRepProof.publicSignals[1],
                unirepSocialContract.address,
                [BigInt(voteAmount), BigInt(0), BigInt(0), BigInt(0), BigInt(0)]
            )
        await tx.wait()
        // should fail to double claim
        const { publicSignals, proof } = await userState.genNegativeRepProof(
            attesterId.toBigInt(),
            BigInt(10)
        )
        await expect(
            unirepSocialContract
                .connect(accounts[0])
                .getSubsidyAirdrop(publicSignals, proof)
        ).to.be.revertedWith('Unirep Social: requesting too much subsidy')
    })

    it('should fail to post with the same proof using subsidy', async () => {
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        await unirepSocialContract
            .connect(accounts[0])
            .userSignUp(id.genIdentityCommitment())
            .then((t) => t.wait())
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id
        )
        const attesterId = await unirepContract.attesters(
            unirepSocialContract.address
        )
        const subsidyProof = await userState.genSubsidyProof(
            attesterId.toBigInt()
        )
        expect(await subsidyProof.verify()).to.be.true
        // now create a post
        const content = 'test post'
        const hashedContent = ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(content)
        )
        await unirepSocialContract
            .connect(accounts[0])
            .publishPostSubsidy(
                hashedContent,
                subsidyProof.publicSignals,
                subsidyProof.proof,
                {
                    value: attestingFee,
                }
            )
            .then((t) => t.wait())

        // reuse proof
        await expect(
            unirepSocialContract
                .connect(accounts[0])
                .publishPostSubsidy(
                    hashedContent,
                    subsidyProof.publicSignals,
                    subsidyProof.proof,
                    {
                        value: attestingFee,
                    }
                )
        ).to.be.revertedWith('Unirep Social: the proof is submitted before')
        await userState.stop()
    })

    it('should fail to create a comment with the same proof using subsidy', async () => {
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        await unirepSocialContract
            .connect(accounts[0])
            .userSignUp(id.genIdentityCommitment())
            .then((t) => t.wait())
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id
        )
        const attesterId = await unirepContract.attesters(
            unirepSocialContract.address
        )
        const subsidyProof = await userState.genSubsidyProof(
            attesterId.toBigInt()
        )
        expect(await subsidyProof.verify()).to.be.true
        // now create a post
        const content = 'test comment'
        const hashedContent = ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(content)
        )
        await unirepSocialContract
            .connect(accounts[0])
            .publishCommentSubsidy(
                '0x000001', // dummy post id
                hashedContent,
                subsidyProof.publicSignals,
                subsidyProof.proof,
                {
                    value: attestingFee,
                }
            )
            .then((t) => t.wait())

        // reuse proof
        await expect(
            unirepSocialContract.connect(accounts[0]).publishCommentSubsidy(
                '0x000001', // dummy post id
                hashedContent,
                subsidyProof.publicSignals,
                subsidyProof.proof,
                {
                    value: attestingFee,
                }
            )
        ).to.be.revertedWith('Unirep Social: the proof is submitted before')
        await userState.stop()
    })

    it('should fail to create a vote with the same proof using subsidy', async () => {
        const accounts = await ethers.getSigners()
        const attesterId = await unirepContract.attesters(
            unirepSocialContract.address
        )
        const receivingId = new ZkIdentity()
        // now create a vote
        const id = new ZkIdentity()
        await unirepSocialContract
            .connect(accounts[0])
            .userSignUp(id.genIdentityCommitment())
            .then((t) => t.wait())
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id
        )
        const epoch = await unirepContract.currentEpoch()
        const toEpochKey = genEpochKey(
            receivingId.identityNullifier,
            epoch.toNumber(),
            0
        )
        const subsidyProof = await userState.genSubsidyProof(
            attesterId.toBigInt(),
            BigInt(0),
            toEpochKey
        )
        expect(await subsidyProof.verify()).to.be.true
        const voteAmount = 3
        await unirepSocialContract
            .connect(accounts[1])
            .voteSubsidy(
                voteAmount,
                0,
                toEpochKey,
                subsidyProof.publicSignals,
                subsidyProof.proof,
                {
                    value: attestingFee.mul(2),
                }
            )
            .then((t) => t.wait())

        // reuse proof
        await expect(
            unirepSocialContract
                .connect(accounts[1])
                .voteSubsidy(
                    voteAmount,
                    0,
                    toEpochKey,
                    subsidyProof.publicSignals,
                    subsidyProof.proof,
                    {
                        value: attestingFee.mul(2),
                    }
                )
        ).to.be.revertedWith('Unirep Social: the proof is submitted before')
        await userState.stop()
    })
})
