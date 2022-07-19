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
        const repProof = await userState.genProveReputationProof(
            attesterId.toBigInt(),
            0,
            0
        )
        expect(await repProof.verify()).to.be.true
        // now create a post
        await unirepSocialContract
            .connect(accounts[0])
            .publishPost('test post', repProof.publicSignals, repProof.proof, {
                value: attestingFee,
            })
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
        const repProof = await userState.genProveReputationProof(
            attesterId.toBigInt(),
            0,
            0
        )
        expect(await repProof.verify()).to.be.true
        // now create a post
        await unirepSocialContract
            .connect(accounts[0])
            .leaveComment(
                '0x000001', // dummy post id
                'test comment',
                repProof.publicSignals,
                repProof.proof,
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
        const repProof = await userState.genProveReputationProof(
            attesterId.toBigInt(),
            0,
            0
        )
        expect(await repProof.verify()).to.be.true
        const epoch = await unirepContract.currentEpoch()
        await unirepSocialContract
            .connect(accounts[1])
            .vote(
                3,
                0,
                genEpochKey(receivingId.identityNullifier, epoch.toNumber(), 0),
                repProof.publicSignals,
                repProof.proof,
                {
                    value: attestingFee.mul(2),
                }
            )
        await userState.stop()
    })

    it('should fail to spend more than the subsidy', async () => {
        const accounts = await ethers.getSigners()
        const attesterId = await unirepContract.attesters(
            unirepSocialContract.address
        )
        const epkSubsidy = (await unirepSocialContract.epkSubsidy()).toNumber()
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
        const repProof = await userState.genProveReputationProof(
            attesterId.toBigInt(),
            0,
            0
        )
        expect(await repProof.verify()).to.be.true
        await expect(
            unirepSocialContract
                .connect(accounts[1])
                .vote(
                    epkSubsidy + 1,
                    0,
                    '0x000001',
                    repProof.publicSignals,
                    repProof.proof,
                    {
                        value: attestingFee.mul(2),
                    }
                )
        ).to.be.reverted
        await userState.stop()
    })

    it('should partially spend using subsidy', async () => {
        const accounts = await ethers.getSigners()
        const attesterId = await unirepContract.attesters(
            unirepSocialContract.address
        )
        const receivingId = new ZkIdentity()
        // now create a vote
        {
            const id = new ZkIdentity()
            await unirepSocialContract
                .connect(accounts[0])
                .userSignUp(receivingId.genIdentityCommitment())
                .then((t) => t.wait())
            await unirepSocialContract
                .connect(accounts[0])
                .userSignUp(id.genIdentityCommitment())
                .then((t) => t.wait())
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                id
            )
            const repProof = await userState.genProveReputationProof(
                attesterId.toBigInt(),
                0,
                0
            )
            expect(await repProof.verify()).to.be.true
            const epoch = await unirepContract.currentEpoch()
            await unirepSocialContract
                .connect(accounts[1])
                .vote(
                    5,
                    0,
                    genEpochKey(
                        receivingId.identityNullifier,
                        epoch.toNumber(),
                        0
                    ),
                    repProof.publicSignals,
                    repProof.proof,
                    {
                        value: attestingFee.mul(2),
                    }
                )
            await userState.stop()
        }
        // need to do a UST to get access to the rep
        const { epochLength } = await unirepContract.config()
        await ethers.provider.send('evm_increaseTime', [epochLength.toNumber()])
        await unirepContract
            .connect(accounts[1])
            .beginEpochTransition()
            .then((t) => t.wait())
        {
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
            for (let i = 0; i < processAttestationProofs.length; i++) {
                expect(
                    await processAttestationProofs[i].verify(),
                    'Verify process attestations circuit off-chain failed'
                ).to.be.true

                await unirepSocialContract
                    .processAttestations(
                        processAttestationProofs[i].publicSignals,
                        processAttestationProofs[i].proof
                    )
                    .then((t) => t.wait())
            }

            await unirepContract
                .updateUserStateRoot(
                    finalTransitionProof.publicSignals,
                    finalTransitionProof.proof
                )
                .then((t) => t.wait())
            await userState.stop()
        }
        // now receivingId has a positive rep balance
        {
            const epoch = (await unirepContract.currentEpoch()).toNumber()
            const epochKey = genEpochKey(
                receivingId.identityNullifier,
                epoch,
                0
            )
            const epkSubsidy = (
                await unirepSocialContract.epkSubsidy()
            ).toNumber()
            const spentSubsidy = (
                await unirepSocialContract.subsidies(epoch, epochKey)
            ).toNumber()
            const remainingSubsidy = epkSubsidy - spentSubsidy
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                receivingId
            )
            const repProof = await userState.genProveReputationProof(
                attesterId.toBigInt(),
                0,
                0,
                undefined,
                undefined,
                5
            )
            expect(await repProof.verify()).to.be.true
            // now create a post
            await unirepSocialContract
                .connect(accounts[1])
                .vote(
                    remainingSubsidy + 5,
                    0,
                    '0x00001',
                    repProof.publicSignals,
                    repProof.proof,
                    {
                        value: attestingFee.mul(2),
                    }
                )
                .then((t) => t.wait())
            await userState.stop()
        }
    })
})
