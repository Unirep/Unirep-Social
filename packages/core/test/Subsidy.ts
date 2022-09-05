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
        await unirepSocialContract
            .connect(accounts[0])
            .publishPostSubsidy(
                'test post',
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
        await unirepSocialContract
            .connect(accounts[0])
            .publishCommentSubsidy(
                '0x000001', // dummy post id
                'test comment',
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
})
