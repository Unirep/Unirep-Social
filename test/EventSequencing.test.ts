// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { expect } from 'chai'
import { BigNumber, BigNumberish, ethers } from 'ethers'
import { config, crypto, circuits, contracts, core } from 'unirep'

import {
    genRandomList,
    getTreeDepthsForTesting,
    ReputationProof,
    UserTransitionProof,
} from './utils'
import {
    defaultCommentReputation,
    defaultPostReputation,
} from '../config/socialMedia'
import { deployUnirepSocial, UnirepSocial } from '../core/utils'

const genRandomProof = (): crypto.SnarkProof => {
    return circuits.formatProofForSnarkjsVerification(
        genRandomList(8).map((n) => n.toString())
    ) as crypto.SnarkProof
}

const genRandomBigNumberish = (): BigNumberish => {
    return crypto.genRandomSalt() as BigNumberish
}

describe('EventSequencing', function () {
    this.timeout(600000)

    let expectedUnirepEventsInOrder: number[] = []
    let expectedSignUpEventsLength: number = 0
    let expectedPostEventsLength: number = 0
    let expectedCommentEventsLength: number = 0
    let expectedVoteEventsLength: number = 0

    let unirepContract
    let unirepSocialContract: UnirepSocial

    let accounts: ethers.Signer[]
    let epochKeyNonce = 0
    const transitionFromEpoch = 1
    const epochKey = core.genEpochKey(crypto.genRandomSalt(), 1, epochKeyNonce)

    const repPublicSignals = genRandomList(18) as BigNumberish[]
    const ustPublicSignals = genRandomList(12) as BigNumberish[]
    const indexes = [1, 2, 3, 4] as BigNumberish[]

    let currentEpoch
    let userIds: any[] = [],
        userCommitments: any[] = []
    const text = crypto.genRandomSalt().toString()
    let proofIndex
    let postId

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

    it('should sign up first user', async () => {
        const userId = new crypto.ZkIdentity()
        const userCommitment = userId.genIdentityCommitment()
        userIds.push(userId)
        userCommitments.push(userCommitment)
        const tx = await unirepSocialContract.userSignUp(
            BigNumber.from(userCommitment)
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(contracts.Event.UserSignedUp)
        expectedSignUpEventsLength++
    })

    it('should publish a post by first user', async () => {
        currentEpoch = await unirepContract.currentEpoch()
        const reputationProof = new ReputationProof(
            repPublicSignals,
            genRandomProof()
        )
        reputationProof.proveReputationAmount = defaultPostReputation
        reputationProof.epoch = 1
        reputationProof.attesterId = 1
        reputationProof.epochKey = epochKey as BigNumberish

        const tx = await unirepSocialContract.publishPost(
            text,
            reputationProof,
            { value: config.ATTESTTING_FEE, gasLimit: 1000000 }
        )
        const receipt = await tx.wait()
        expect(receipt.status, 'Submit post failed').to.equal(1)
        postId = tx.hash
        expectedUnirepEventsInOrder.push(contracts.Event.AttestationSubmitted)
        expectedPostEventsLength++
    })

    it('should sign up second user', async () => {
        const userId = new crypto.ZkIdentity()
        const userCommitment = userId.genIdentityCommitment()
        userIds.push(userId)
        userCommitments.push(userCommitment)
        const tx = await unirepSocialContract.userSignUp(
            BigNumber.from(userCommitment)
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(contracts.Event.UserSignedUp)
        expectedSignUpEventsLength++
    })

    it('should leave a comment by second user', async () => {
        const reputationProof = new ReputationProof(
            repPublicSignals,
            genRandomProof()
        )
        reputationProof.proveReputationAmount = defaultCommentReputation
        reputationProof.epoch = 1
        reputationProof.attesterId = 1
        reputationProof.epochKey = epochKey as BigNumberish

        const tx = await unirepSocialContract.leaveComment(
            postId,
            text,
            reputationProof,
            { value: config.ATTESTTING_FEE, gasLimit: 1000000 }
        )
        const receipt = await tx.wait()
        expect(receipt.status, 'Submit comment failed').to.equal(1)
        expectedUnirepEventsInOrder.push(contracts.Event.AttestationSubmitted)
        expectedCommentEventsLength++

        const proofNullifier = await unirepContract.hashReputationProof(
            reputationProof
        )
        proofIndex = await unirepContract.getProofIndex(proofNullifier)
    })

    it('first user should upvote second user', async () => {
        let upvoteValue = 3
        let epochKeyNonce = 1
        const toEpochKey = core.genEpochKey(
            userIds[1].getNullifier(),
            currentEpoch,
            epochKeyNonce
        )

        const reputationProof = new ReputationProof(
            repPublicSignals,
            genRandomProof()
        )
        reputationProof.proveReputationAmount = upvoteValue
        reputationProof.epoch = 1
        reputationProof.attesterId = 1
        reputationProof.epochKey = epochKey as BigNumberish

        const tx = await unirepSocialContract.vote(
            upvoteValue,
            0,
            toEpochKey as BigNumberish,
            proofIndex as BigNumberish,
            reputationProof,
            { value: config.ATTESTTING_FEE.mul(2), gasLimit: 1000000 }
        )
        const receipt = await tx.wait()
        expect(receipt.status, 'Submit upvote failed').to.equal(1)
        expectedUnirepEventsInOrder.push(contracts.Event.AttestationSubmitted)
        expectedUnirepEventsInOrder.push(contracts.Event.AttestationSubmitted)
        expectedVoteEventsLength++
    })

    it('first epoch ended', async () => {
        await hardhatEthers.provider.send('evm_increaseTime', [
            config.EPOCH_LENGTH,
        ]) // Fast-forward epochLength of seconds
        const tx = await unirepContract.beginEpochTransition()
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        currentEpoch = await unirepContract.currentEpoch()
        expectedUnirepEventsInOrder.push(contracts.Event.EpochEnded)
    })

    it('Second user should perform transition', async () => {
        let tx = await unirepSocialContract.startUserStateTransition(
            genRandomBigNumberish(),
            genRandomBigNumberish(),
            genRandomBigNumberish(),
            circuits.formatProofForVerifierContract(genRandomProof())
        )
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        tx = await unirepSocialContract.processAttestations(
            genRandomBigNumberish(),
            genRandomBigNumberish(),
            genRandomBigNumberish(),
            circuits.formatProofForVerifierContract(genRandomProof())
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const USTProof = new UserTransitionProof(
            ustPublicSignals,
            genRandomProof()
        )
        USTProof.transitionFromEpoch = transitionFromEpoch

        tx = await unirepSocialContract.updateUserStateRoot(USTProof, indexes)
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(contracts.Event.UserStateTransitioned)
    })

    it('second epoch ended', async () => {
        await hardhatEthers.provider.send('evm_increaseTime', [
            config.EPOCH_LENGTH,
        ]) // Fast-forward epochLength of seconds
        const tx = await unirepContract.beginEpochTransition()
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        currentEpoch = await unirepContract.currentEpoch()
        expectedUnirepEventsInOrder.push(contracts.Event.EpochEnded)
    })

    it('Third epoch ended', async () => {
        await hardhatEthers.provider.send('evm_increaseTime', [
            config.EPOCH_LENGTH,
        ]) // Fast-forward epochLength of seconds
        const tx = await unirepContract.beginEpochTransition()
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        currentEpoch = await unirepContract.currentEpoch()
        expectedUnirepEventsInOrder.push(contracts.Event.EpochEnded)
    })

    it('First user should perform transition', async () => {
        let tx = await unirepSocialContract.startUserStateTransition(
            genRandomBigNumberish(),
            genRandomBigNumberish(),
            genRandomBigNumberish(),
            circuits.formatProofForVerifierContract(genRandomProof())
        )
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        tx = await unirepSocialContract.processAttestations(
            genRandomBigNumberish(),
            genRandomBigNumberish(),
            genRandomBigNumberish(),
            circuits.formatProofForVerifierContract(genRandomProof())
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const USTProof = new UserTransitionProof(
            ustPublicSignals,
            genRandomProof()
        )
        USTProof.transitionFromEpoch = transitionFromEpoch

        tx = await unirepSocialContract.updateUserStateRoot(USTProof, indexes)
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(contracts.Event.UserStateTransitioned)
    })

    it('Second user should perform transition', async () => {
        let tx = await unirepSocialContract.startUserStateTransition(
            genRandomBigNumberish(),
            genRandomBigNumberish(),
            genRandomBigNumberish(),
            circuits.formatProofForVerifierContract(genRandomProof())
        )
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        tx = await unirepSocialContract.processAttestations(
            genRandomBigNumberish(),
            genRandomBigNumberish(),
            genRandomBigNumberish(),
            circuits.formatProofForVerifierContract(genRandomProof())
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const USTProof = new UserTransitionProof(
            ustPublicSignals,
            genRandomProof()
        )
        USTProof.transitionFromEpoch = transitionFromEpoch

        tx = await unirepSocialContract.updateUserStateRoot(USTProof, indexes)
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(contracts.Event.UserStateTransitioned)
    })

    it('Unirep events order should match sequencer order', async () => {
        const sequencerFilter = unirepContract.filters.Sequencer()
        const sequencerEvents = await unirepContract.queryFilter(
            sequencerFilter
        )

        for (let i = 0; i < sequencerEvents.length; i++) {
            const event = sequencerEvents[i]
            expect(event.args.userEvent).equal(expectedUnirepEventsInOrder[i])
        }
    })

    it('Unirep Social events should match all actions', async () => {
        const userSignUpFilter = unirepSocialContract.filters.UserSignedUp()
        const userSignUpEvents = await unirepSocialContract.queryFilter(
            userSignUpFilter
        )
        expect(userSignUpEvents.length).equal(expectedSignUpEventsLength)

        const postFilter = unirepSocialContract.filters.PostSubmitted()
        const postEvents = await unirepSocialContract.queryFilter(postFilter)
        expect(postEvents.length).equal(expectedPostEventsLength)

        const commentFilter = unirepSocialContract.filters.CommentSubmitted()
        const commentEvents = await unirepSocialContract.queryFilter(
            commentFilter
        )
        expect(commentEvents.length).equal(expectedCommentEventsLength)

        const voteFilter = unirepSocialContract.filters.VoteSubmitted()
        const voteEvents = await unirepSocialContract.queryFilter(voteFilter)
        expect(voteEvents.length).equal(expectedVoteEventsLength)
    })
})
