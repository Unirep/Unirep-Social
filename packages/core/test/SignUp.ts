// @ts-ignore
import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { expect } from 'chai'
import * as config from '@unirep/circuits'
import { deployUnirep } from '@unirep/contracts/deploy'
import { ZkIdentity, genRandomSalt } from '@unirep/crypto'
import { genEpochKey } from '@unirep/core'
import { deployUnirepSocial, UnirepSocial } from '../src/utils'
import { Attestation } from '@unirep/contracts'

const DEFAULT_ATTESTING_FEE = BigNumber.from(1)

describe('Signup', function () {
    this.timeout(1000000)
    let unirepContract
    let unirepSocialContract: UnirepSocial

    const maxUsers = 3
    const maxAttesters = 3

    before(async () => {
        const accounts = await ethers.getSigners()

        const _settings = {
            maxUsers: maxUsers,
            maxAttesters: maxAttesters,
            numEpochKeyNoncePerEpoch: config.NUM_EPOCH_KEY_NONCE_PER_EPOCH,
            maxReputationBudget: config.MAX_REPUTATION_BUDGET,
            epochLength: config.EPOCH_LENGTH,
            attestingFee: DEFAULT_ATTESTING_FEE,
        }
        unirepContract = await deployUnirep(accounts[0], _settings)
        unirepSocialContract = await deployUnirepSocial(
            accounts[0],
            unirepContract.address
        )
    })

    describe('User sign-ups', () => {
        const id = new ZkIdentity()
        const commitment = id.genIdentityCommitment()

        it('sign up should succeed', async () => {
            const tx = await unirepSocialContract.userSignUp(
                BigNumber.from(commitment)
            )
            const receipt = await tx.wait()

            expect(receipt.status).equal(1)

            const numUserSignUps_ = await unirepContract.numUserSignUps()
            expect(1).equal(numUserSignUps_)
        })

        it('double sign up should fail', async () => {
            await expect(
                unirepSocialContract.userSignUp(BigNumber.from(commitment))
            ).to.be.revertedWithCustomError(
                unirepContract,
                'UserAlreadySignedUp'
            )
        })

        it('sign up should fail if max capacity reached', async () => {
            for (let i = 1; i < maxUsers; i++) {
                const _id = new ZkIdentity()
                let tx = await unirepSocialContract.userSignUp(
                    BigNumber.from(_id.genIdentityCommitment())
                )
                let receipt = await tx.wait()
                expect(receipt.status).equal(1)
            }
            const _id = new ZkIdentity()
            await expect(
                unirepSocialContract.userSignUp(
                    BigNumber.from(_id.genIdentityCommitment())
                )
            ).to.be.revertedWithCustomError(
                unirepContract,
                'ReachedMaximumNumberUserSignedUp'
            )
        })

        it('setUsername should succeed', async () => {
            const epoch = Number(await unirepContract.currentEpoch())
            const epkNonce = 1
            const randomEpochKey = genEpochKey(
                genRandomSalt(),
                epoch,
                epkNonce
            ).valueOf()
            const oldUsername = genRandomSalt().valueOf()
            const newUsername = genRandomSalt().valueOf()
            const accounts = await ethers.getSigners()

            const tx = await unirepSocialContract
                .connect(accounts[0])
                .setUsername(randomEpochKey, oldUsername, newUsername, {
                    value: DEFAULT_ATTESTING_FEE,
                })
            const receipt = await tx.wait()

            expect(receipt.status).equal(1)
            const isClaimed = await unirepSocialContract.usernames(newUsername)

            expect(isClaimed, 'This username has not been updated').to.be.true
        })

        it('should fail if the contract call was not called by admin', async () => {
            const epoch = Number(await unirepContract.currentEpoch())
            const epkNonce = 1
            const randomEpochKey = genEpochKey(
                genRandomSalt(),
                epoch,
                epkNonce
            ).valueOf()
            const oldUsername = genRandomSalt().valueOf()
            const newUsername = genRandomSalt().valueOf()
            const accounts = await ethers.getSigners()

            await expect(
                unirepSocialContract
                    .connect(accounts[1])
                    .setUsername(randomEpochKey, oldUsername, newUsername, {
                        value: DEFAULT_ATTESTING_FEE,
                    })
            ).to.be.revertedWith(
                'Only admin can send transactions to this contract'
            )
        })

        it('should fail if a username is double registered', async () => {
            const epoch = Number(await unirepContract.currentEpoch())
            const epkNonce = 1
            const randomEpochKey1 = genEpochKey(
                genRandomSalt(),
                epoch,
                epkNonce
            ).valueOf()

            const oldUsername2 = genRandomSalt().valueOf()
            const newUsername2 = genRandomSalt().valueOf()
            const accounts = await ethers.getSigners()

            // set newUserName to randomEpochKey1
            await unirepSocialContract
                .connect(accounts[0])
                .setUsername(randomEpochKey1, oldUsername2, newUsername2, {
                    value: DEFAULT_ATTESTING_FEE,
                })
                .then((t) => t.wait())

            const oldUsername3 = 0
            const randomEpochKey2 = genEpochKey(
                genRandomSalt(),
                epoch,
                epkNonce
            ).valueOf()

            // try to set the same newUserName to randomEpochKey2
            await expect(
                unirepSocialContract
                    .connect(accounts[0])
                    .setUsername(randomEpochKey2, oldUsername3, newUsername2, {
                        value: DEFAULT_ATTESTING_FEE,
                    })
            ).to.be.revertedWith('This username is already taken')
        })

        it('should mark old username as not claimed', async () => {
            const epoch = Number(await unirepContract.currentEpoch())
            const epkNonce = 1
            const randomEpochKey = genEpochKey(
                genRandomSalt(),
                epoch,
                epkNonce
            ).valueOf()
            const oldUsername4 = genRandomSalt().valueOf()
            const newUsername4 = genRandomSalt().valueOf()
            const accounts = await ethers.getSigners()

            const tx1 = await unirepSocialContract
                .connect(accounts[0])
                .setUsername(randomEpochKey, oldUsername4, newUsername4, {
                    value: DEFAULT_ATTESTING_FEE,
                })

            const receipt1 = await tx1.wait()
            expect(receipt1.status).equal(1)

            const isClaimedBefore = await unirepSocialContract.usernames(
                newUsername4
            )
            expect(isClaimedBefore, 'The old username has not been free').to.be
                .true

            const newUsername5 = genRandomSalt().valueOf()

            const tx2 = await unirepSocialContract
                .connect(accounts[0])
                .setUsername(randomEpochKey, newUsername4, newUsername5, {
                    value: DEFAULT_ATTESTING_FEE,
                })
            const receipt2 = await tx2.wait()
            expect(receipt2.status).equal(1)

            const isClaimedAfter = await unirepSocialContract.usernames(
                newUsername4
            )
            expect(isClaimedAfter, 'The old username has not been free').to.be
                .false
        })

        it('should emit attestation event with graffiti matching the new username', async () => {
            const epoch = Number(await unirepContract.currentEpoch())
            const epkNonce = 1
            const randomEpochKey = genEpochKey(
                genRandomSalt(),
                epoch,
                epkNonce
            ).valueOf()
            const oldUsername5 = genRandomSalt().valueOf()
            const newUsername5 = genRandomSalt().valueOf()
            const accounts = await ethers.getSigners()

            const tx = await unirepSocialContract
                .connect(accounts[0])
                .setUsername(randomEpochKey, oldUsername5, newUsername5, {
                    value: DEFAULT_ATTESTING_FEE,
                })
            const receipt = await tx.wait()

            expect(receipt.status).equal(1)

            const attesterId = Number(await unirepSocialContract.attesterId())

            await expect(tx)
                .to.emit(unirepContract, 'AttestationSubmitted')
                .withArgs(epoch, randomEpochKey, unirepSocialContract.address, [
                    BigInt(attesterId),
                    BigInt(0),
                    BigInt(0),
                    newUsername5,
                    BigInt(0),
                ])
        })
    })
})
