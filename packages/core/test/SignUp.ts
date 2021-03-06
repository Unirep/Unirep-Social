// @ts-ignore
import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { expect } from 'chai'
import * as config from '@unirep/circuits'
import { deployUnirep } from '@unirep/contracts'
import { ZkIdentity } from '@unirep/crypto'

import { deployUnirepSocial, UnirepSocial } from '../src/utils'

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
    })
})
