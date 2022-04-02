// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import { expect } from 'chai'
import { config, crypto, contracts, core } from 'unirep'

import { getTreeDepthsForTesting } from './utils'
import {
    defaultAirdroppedReputation,
    defaultCommentReputation,
    defaultPostReputation,
} from '../config/socialMedia'
import { deployUnirepSocial, UnirepSocial } from '../core/utils'

describe('Signup', function () {
    this.timeout(1000000)
    let unirepContract: contracts.Unirep
    let unirepSocialContract: UnirepSocial

    let accounts: ethers.Signer[]
    const maxUsers = 3
    const maxAttesters = 3

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting()
        const _settings = {
            maxUsers: maxUsers,
            maxAttesters: maxAttesters,
            numEpochKeyNoncePerEpoch: config.NUM_EPOCH_KEY_NONCE_PER_EPOCH,
            maxReputationBudget: config.MAX_REPUTATION_BUDGET,
            epochLength: config.EPOCH_LENGTH,
            attestingFee: config.ATTESTTING_FEE,
        }
        unirepContract = await contracts.deployUnirep(
            <ethers.Wallet>accounts[0],
            _treeDepths,
            _settings
        )
        unirepSocialContract = await deployUnirepSocial(
            <ethers.Wallet>accounts[0],
            unirepContract.address
        )
    })

    it('should have the correct config value', async () => {
        const attestingFee_ = await unirepContract.attestingFee()
        expect(config.ATTESTTING_FEE).equal(attestingFee_)
        const epochLength_ = await unirepContract.epochLength()
        expect(config.EPOCH_LENGTH).equal(epochLength_)
        const numEpochKeyNoncePerEpoch_ =
            await unirepContract.numEpochKeyNoncePerEpoch()
        expect(config.NUM_EPOCH_KEY_NONCE_PER_EPOCH).equal(
            numEpochKeyNoncePerEpoch_
        )
        const maxUsers_ = await unirepContract.maxUsers()
        expect(maxUsers).equal(maxUsers_)

        const treeDepths_ = await unirepContract.treeDepths()
        expect(config.EPOCH_TREE_DEPTH).equal(treeDepths_.epochTreeDepth)
        expect(config.GLOBAL_STATE_TREE_DEPTH).equal(
            treeDepths_.globalStateTreeDepth
        )
        expect(config.USER_STATE_TREE_DEPTH).equal(
            treeDepths_.userStateTreeDepth
        )

        const postReputation_ = await unirepSocialContract.postReputation()
        expect(postReputation_).equal(defaultPostReputation)
        const commentReputation_ =
            await unirepSocialContract.commentReputation()
        expect(commentReputation_).equal(defaultCommentReputation)
        const airdroppedReputation_ =
            await unirepSocialContract.airdroppedReputation()
        expect(airdroppedReputation_).equal(defaultAirdroppedReputation)
        const unirepAddress_ = await unirepSocialContract.unirep()
        expect(unirepAddress_).equal(unirepContract.address)
        const unirepSocialAttesterId = await unirepContract.attesters(
            unirepSocialContract.address
        )
        expect(unirepSocialAttesterId.toNumber()).equal(1)
    })

    describe('User sign-ups', () => {
        const id = new crypto.ZkIdentity()
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
            ).to.be.revertedWith('Unirep: the user has already signed up')
        })

        it('sign up should fail if max capacity reached', async () => {
            for (let i = 1; i < maxUsers; i++) {
                let tx = await unirepSocialContract.userSignUp(
                    BigNumber.from(crypto.genRandomSalt())
                )
                let receipt = await tx.wait()
                expect(receipt.status).equal(1)
            }
            await expect(
                unirepSocialContract.userSignUp(
                    BigNumber.from(crypto.genRandomSalt())
                )
            ).to.be.revertedWith(
                'Unirep: maximum number of user signups reached'
            )
        })
    })
})
