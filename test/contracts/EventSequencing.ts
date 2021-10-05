import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt, genIdentity, genIdentityCommitment } from '@unirep/crypto'
import { deployUnirep } from '@unirep/contracts'
import { attestingFee, epochLength, numEpochKeyNoncePerEpoch, maxReputationBudget } from '@unirep/unirep'

import { genEpochKey, getTreeDepthsForTesting } from '../utils'
import { DEFAULT_COMMENT_KARMA, DEFAULT_POST_KARMA } from '../../config/socialMedia'
import { deployUnirepSocial } from '../../core/utils'

describe('EventSequencing', function (){
    this.timeout(600000)
    
    enum unirepEvents { 
        UserSignUp,
        AttestationSubmitted,
        ReputationNullifierSubmitted,
        EpochEnded,
        StartedTransition,
        ProcessedAttestations,
        UserStateTransitioned
    }

    let expectedUnirepEventsInOrder: number[] = []
    let expectedSignUpEventsLength: number = 0
    let expectedPostEventsLength: number = 0
    let expectedCommentEventsLength: number = 0
    let expectedVoteEventsLength: number = 0

    let unirepContract
    let unirepSocialContract

    let accounts: ethers.Signer[]
    let epochKeyNonce = 0
    const epochKey = genEpochKey(genRandomSalt(), 1, epochKeyNonce)
    const reputationNullifiers: BigInt[] = []
    for (let i = 0; i < maxReputationBudget; i++) {
        reputationNullifiers.push(BigInt(255))
    }
    const proof: BigInt[] = []
    for (let i = 0; i < 8; i++) {
        proof.push(BigInt(255))
    }
    const epkNullifiers: BigInt[] = []
    const blindedHashChains: BigInt[] = []
    const blindedUserStates: BigInt[] = []
    for (let i = 0; i < numEpochKeyNoncePerEpoch; i++) {
        epkNullifiers.push(BigInt(255))
        blindedHashChains.push(BigInt(255))
    }
    for (let i = 0; i < 2; i++) {
        blindedUserStates.push(BigInt(255))
    }

    let currentEpoch
    let userIds: any[] = [], userCommitments: any[] = []
    const postId = genRandomSalt()
    const commentId = genRandomSalt()
    const text = genRandomSalt().toString()

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting('circuit')
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths)
        unirepSocialContract = await deployUnirepSocial(<ethers.Wallet>accounts[0], unirepContract.address)
    })

    it('should sign up first user', async () => {
        const userId = genIdentity()
        const userCommitment = genIdentityCommitment(userId)
        userIds.push(userId)
        userCommitments.push(userCommitment)
        const tx = await unirepSocialContract.userSignUp(userCommitment)
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.UserSignUp)
        expectedSignUpEventsLength++
    })

    it('should publish a post by first user', async () => {
        currentEpoch = await unirepContract.currentEpoch()
       
        const publicSignals = [
            epochKey,
            genRandomSalt(),
            1,
            DEFAULT_POST_KARMA,
            0,
            0,
            0,
            proof
        ]

        const tx = await unirepSocialContract.publishPost(
            postId, 
            text, 
            reputationNullifiers,
            publicSignals,
            { value: attestingFee, gasLimit: 1000000 }
        )
        const receipt = await tx.wait()
        expect(receipt.status, 'Submit post failed').to.equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.ReputationNullifierSubmitted)
        expectedUnirepEventsInOrder.push(unirepEvents.AttestationSubmitted)
        expectedPostEventsLength++
    })

    it('should sign up seconde user', async () => {
        const userId = genIdentity()
        const userCommitment = genIdentityCommitment(userId)
        userIds.push(userId)
        userCommitments.push(userCommitment)
        const tx = await unirepSocialContract.userSignUp(userCommitment)
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.UserSignUp)
        expectedSignUpEventsLength++
    })

    it('should leave a comment by seconde user', async () => {
        let epochKeyNonce = 0
        const epochKey = genEpochKey(userIds[1].identityNullifier, currentEpoch, epochKeyNonce)

        const publicSignals = [
            epochKey,
            genRandomSalt(),
            1,
            DEFAULT_COMMENT_KARMA,
            0,
            0,
            0,
            proof
        ]
        const tx = await unirepSocialContract.leaveComment(
            postId, 
            commentId,
            text, 
            reputationNullifiers,
            publicSignals,
            { value: attestingFee, gasLimit: 1000000 }
        )
        const receipt = await tx.wait()
        expect(receipt.status, 'Submit comment failed').to.equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.ReputationNullifierSubmitted)
        expectedUnirepEventsInOrder.push(unirepEvents.AttestationSubmitted)
        expectedCommentEventsLength++
    })
        
    it('first user should upvote second user', async () => {
        let upvoteValue = 3
        let epochKeyNonce = 1
        const epochKey = genEpochKey(userIds[1].identityNullifier, currentEpoch, epochKeyNonce)

        const proofsRelated = [
            epochKey,
            genRandomSalt(),
            1,
            upvoteValue,
            0,
            0,
            0,
            proof
        ]

        const tx = await unirepSocialContract.vote(
            upvoteValue,
            0,
            epochKey,
            reputationNullifiers,
            proofsRelated,
            { value: attestingFee.mul(2), gasLimit: 1000000 }
        )
        const receipt = await tx.wait()
        expect(receipt.status, 'Submit upvote failed').to.equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.ReputationNullifierSubmitted)
        expectedUnirepEventsInOrder.push(unirepEvents.AttestationSubmitted)
        expectedUnirepEventsInOrder.push(unirepEvents.AttestationSubmitted)
        expectedVoteEventsLength++
    })

    it('first epoch ended', async () => {
        let currentEpoch = unirepContract.currentEpoch()
        let numEpochKey = await unirepContract.getNumEpochKey(currentEpoch)
        await hardhatEthers.provider.send("evm_increaseTime", [epochLength])  // Fast-forward epochLength of seconds
        const tx = await unirepContract.beginEpochTransition(numEpochKey)
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        currentEpoch = await unirepContract.currentEpoch()
        expectedUnirepEventsInOrder.push(unirepEvents.EpochEnded)
    })

    it('Second user should perform transition', async () => {
        let transitionFromEpoch = 1
        let tx = await unirepSocialContract.startUserStateTransition(
            genRandomSalt(),
            genRandomSalt(),
            genRandomSalt(),
            proof,
        )
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.StartedTransition)

        tx = await unirepSocialContract.processAttestations(
            genRandomSalt(),
            genRandomSalt(),
            genRandomSalt(),
            proof,
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.ProcessedAttestations)

        tx = await unirepSocialContract.updateUserStateRoot(
            genRandomSalt(),
            epkNullifiers,
            blindedUserStates,
            blindedHashChains,
            transitionFromEpoch,
            genRandomSalt(),
            genRandomSalt(),
            proof,
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.UserStateTransitioned)
    })

    
    it('second epoch ended', async () => {
        const numEpochKey = await unirepContract.getNumEpochKey(currentEpoch)
        await hardhatEthers.provider.send("evm_increaseTime", [epochLength])  // Fast-forward epochLength of seconds
        const tx = await unirepContract.beginEpochTransition(numEpochKey)
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        currentEpoch = await unirepContract.currentEpoch()
        expectedUnirepEventsInOrder.push(unirepEvents.EpochEnded)
    })
    
    it('Third epoch ended', async () => {
        const numEpochKey = await unirepContract.getNumEpochKey(currentEpoch)
        await hardhatEthers.provider.send("evm_increaseTime", [epochLength])  // Fast-forward epochLength of seconds
        const tx = await unirepContract.beginEpochTransition(numEpochKey)
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        currentEpoch = await unirepContract.currentEpoch()
        expectedUnirepEventsInOrder.push(unirepEvents.EpochEnded)
    })

    it('First user should perform transition', async () => {
        let transitionFromEpoch = 1
        let tx = await unirepSocialContract.startUserStateTransition(
            genRandomSalt(),
            genRandomSalt(),
            genRandomSalt(),
            proof,
        )
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.StartedTransition)

        tx = await unirepSocialContract.processAttestations(
            genRandomSalt(),
            genRandomSalt(),
            genRandomSalt(),
            proof,
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.ProcessedAttestations)

        tx = await unirepSocialContract.updateUserStateRoot(
            genRandomSalt(),
            epkNullifiers,
            blindedUserStates,
            blindedHashChains,
            transitionFromEpoch,
            genRandomSalt(),
            genRandomSalt(),
            proof,
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.UserStateTransitioned)
    })

    it('Second user should perform transition', async () => {
        let transitionFromEpoch = 1
        let tx = await unirepSocialContract.startUserStateTransition(
            genRandomSalt(),
            genRandomSalt(),
            genRandomSalt(),
            proof,
        )
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.StartedTransition)

        tx = await unirepSocialContract.processAttestations(
            genRandomSalt(),
            genRandomSalt(),
            genRandomSalt(),
            proof,
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.ProcessedAttestations)

        tx = await unirepSocialContract.updateUserStateRoot(
            genRandomSalt(),
            epkNullifiers,
            blindedUserStates,
            blindedHashChains,
            transitionFromEpoch,
            genRandomSalt(),
            genRandomSalt(),
            proof,
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.UserStateTransitioned)
    })

    it('Unirep events order should match sequencer order', async () => {
        const sequencerFilter = unirepContract.filters.Sequencer()
        const sequencerEvents =  await unirepContract.queryFilter(sequencerFilter)

        for (let i = 0; i < sequencerEvents.length; i++) {
            const event = sequencerEvents[i]
            expect(event.args._event).equal(unirepEvents[expectedUnirepEventsInOrder[i]])
        }
    })

    it('Unirep Social events should match all actions', async () => {
        const userSignUpFilter = unirepSocialContract.filters.UserSignedUp()
        const userSignUpEvents =  await unirepSocialContract.queryFilter(userSignUpFilter)
        expect(userSignUpEvents.length).equal(expectedSignUpEventsLength)

        const postFilter = unirepSocialContract.filters.PostSubmitted()
        const postEvents =  await unirepSocialContract.queryFilter(postFilter)
        expect(postEvents.length).equal(expectedPostEventsLength)

        const commentFilter = unirepSocialContract.filters.CommentSubmitted()
        const commentEvents =  await unirepSocialContract.queryFilter(commentFilter)
        expect(commentEvents.length).equal(expectedCommentEventsLength)

        const voteFilter = unirepSocialContract.filters.VoteSubmitted()
        const voteEvents =  await unirepSocialContract.queryFilter(voteFilter)
        expect(voteEvents.length).equal(expectedVoteEventsLength)
    })
})