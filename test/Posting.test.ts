// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { expect } from 'chai'
import { BigNumber, ethers } from 'ethers'
import { config, crypto, contracts, core } from 'unirep'

import {
    findValidNonce,
    getTreeDepthsForTesting,
    ReputationProof,
} from './utils'
import {
    defaultAirdroppedReputation,
    defaultCommentReputation,
    defaultPostReputation,
} from '../config/socialMedia'
import { deployUnirepSocial, UnirepSocial } from '../core/utils'

describe('Post', function () {
    this.timeout(300000)

    let unirepContract
    let unirepSocialContract: UnirepSocial
    const ids = new Array(2)
    const commitments = new Array(2)
    let users: core.UserState[] = new Array(2)

    let accounts: ethers.Signer[]
    const text = crypto.genRandomSalt().toString()
    let attesterId
    let postId

    let reputationProof: ReputationProof

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting()
        const _settings = {
            maxUsers: config.MAX_USERS,
            maxAttesters: config.MAX_ATTESTERS,
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
        expect(config.MAX_USERS).equal(maxUsers_)

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

        attesterId = BigInt(
            await unirepContract.attesters(unirepSocialContract.address)
        )
        expect(attesterId).not.equal(0)
        const airdropAmount = await unirepContract.airdropAmount(
            unirepSocialContract.address
        )
        expect(airdropAmount).equal(defaultAirdroppedReputation)
    })

    describe('User sign-ups', () => {
        it('sign up should succeed', async () => {
            for (let i = 0; i < 2; i++) {
                ids[i] = new crypto.ZkIdentity()
                commitments[i] = ids[i].genIdentityCommitment()
                const tx = await unirepSocialContract.userSignUp(
                    BigNumber.from(commitments[i])
                )
                const receipt = await tx.wait()
                expect(receipt.status).equal(1)

                const numUserSignUps_ = await unirepContract.numUserSignUps()
                expect(i + 1).equal(numUserSignUps_)

                users[i] = await core.genUserStateFromContract(
                    hardhatEthers.provider,
                    unirepContract.address,
                    ids[i]
                )
            }
        })
    })

    describe('Generate reputation proof for verification', () => {
        it('reputation proof should be verified valid off-chain and on-chain', async () => {
            const proveGraffiti = BigInt(0)
            const minPosRep = 0,
                graffitiPreImage = BigInt(0)
            const epkNonce = 0
            const epoch = users[0].getUnirepStateCurrentEpoch()
            const nonceList: BigInt[] = findValidNonce(
                users[0],
                defaultPostReputation,
                epoch,
                attesterId
            )
            const { publicSignals, proof } =
                await users[0].genProveReputationProof(
                    attesterId,
                    epkNonce,
                    minPosRep,
                    proveGraffiti,
                    graffitiPreImage,
                    nonceList
                )
            reputationProof = new ReputationProof(publicSignals, proof)
            const isValid = await reputationProof.verify()
            expect(isValid, 'Verify reputation proof off-chain failed').to.be
                .true

            const isProofValid = await unirepContract.verifyReputation(
                reputationProof
            )
            expect(isProofValid, 'proof is not valid').to.be.true
        })
    })

    describe('Publishing a post', () => {
        it('submit post should succeed', async () => {
            const tx = await unirepSocialContract.publishPost(
                text,
                reputationProof,
                {
                    value: config.ATTESTTING_FEE,
                    gasLimit: 1000000,
                }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit post failed').to.equal(1)
            postId = tx.hash
        })

        it('submit post with different amount of nullifiers should fail', async () => {
            const proveGraffiti = BigInt(0)
            const minPosRep = 0,
                graffitiPreImage = BigInt(0)
            const epkNonce = 0
            const falseRepAmout = 3
            const epoch = users[0].getUnirepStateCurrentEpoch()
            const nonceList: BigInt[] = findValidNonce(
                users[0],
                falseRepAmout,
                epoch,
                attesterId
            )
            const { publicSignals, proof } =
                await users[0].genProveReputationProof(
                    attesterId,
                    epkNonce,
                    minPosRep,
                    proveGraffiti,
                    graffitiPreImage,
                    nonceList
                )
            reputationProof = new ReputationProof(publicSignals, proof)
            const isValid = await reputationProof.verify()
            expect(isValid, 'Verify reputation proof off-chain failed').to.be
                .true

            await expect(
                unirepSocialContract.publishPost(text, reputationProof, {
                    value: config.ATTESTTING_FEE,
                    gasLimit: 1000000,
                })
            ).to.be.revertedWith(
                'Unirep Social: submit different nullifiers amount from the required amount for post'
            )
        })
    })

    describe('Comment a post', () => {
        it('reputation proof should be verified valid off-chain and on-chain', async () => {
            const proveGraffiti = BigInt(0)
            const minPosRep = 20,
                graffitiPreImage = BigInt(0)
            const epkNonce = 0
            const epoch = users[1].getUnirepStateCurrentEpoch()
            const nonceList: BigInt[] = findValidNonce(
                users[1],
                defaultCommentReputation,
                epoch,
                attesterId
            )
            const { publicSignals, proof } =
                await users[1].genProveReputationProof(
                    attesterId,
                    epkNonce,
                    minPosRep,
                    proveGraffiti,
                    graffitiPreImage,
                    nonceList
                )
            reputationProof = new ReputationProof(publicSignals, proof)
            const isValid = await reputationProof.verify()
            expect(isValid, 'Verify reputation proof off-chain failed').to.be
                .true

            const isProofValid = await unirepContract.verifyReputation(
                reputationProof
            )
            expect(isProofValid, 'proof is not valid').to.be.true
        })

        it('submit comment should succeed', async () => {
            const tx = await unirepSocialContract.leaveComment(
                postId,
                text,
                reputationProof,
                {
                    value: config.ATTESTTING_FEE,
                    gasLimit: 1000000,
                }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit comment failed').to.equal(1)
        })

        it('submit comment with different amount of nullifiers should fail', async () => {
            const proveGraffiti = BigInt(0)
            const minPosRep = 0,
                graffitiPreImage = BigInt(0)
            const epkNonce = 0
            const falseRepAmout = 1
            const epoch = users[1].getUnirepStateCurrentEpoch()
            const nonceList: BigInt[] = findValidNonce(
                users[1],
                falseRepAmout,
                epoch,
                attesterId
            )
            const { publicSignals, proof } =
                await users[1].genProveReputationProof(
                    attesterId,
                    epkNonce,
                    minPosRep,
                    proveGraffiti,
                    graffitiPreImage,
                    nonceList
                )
            reputationProof = new ReputationProof(publicSignals, proof)
            const isValid = await reputationProof.verify()
            expect(isValid, 'Verify reputation proof off-chain failed').to.be
                .true

            await expect(
                unirepSocialContract.leaveComment(
                    postId,
                    text,
                    reputationProof,
                    {
                        value: config.ATTESTTING_FEE,
                        gasLimit: 1000000,
                    }
                )
            ).to.be.revertedWith(
                'Unirep Social: submit different nullifiers amount from the required amount for comment'
            )
        })
    })
})
