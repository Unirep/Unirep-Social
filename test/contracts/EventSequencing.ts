import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt, genIdentity, genIdentityCommitment } from '@unirep/crypto'
import { deployUnirep } from '@unirep/contracts'
import { attestingFee, epochLength, numEpochKeyNoncePerEpoch, maxReputationBudget, maxUsers, maxAttesters } from '@unirep/unirep'

import { genEpochKey, getTreeDepthsForTesting } from '../utils'
import { defaultCommentReputation, defaultPostReputation } from '../../config/socialMedia'
import { deployUnirepSocial } from '../../core/utils'

describe('EventSequencing', function (){
    this.timeout(600000)
    
    enum unirepEvents { 
        NewGSTLeafInserted,
        AttestationSubmitted,
        EpochEnded,
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
    const indexes: BigInt[] = []
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
    let proofIndex

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting('circuit')
        const _settings = {
            maxUsers: maxUsers,
            maxAttesters: maxAttesters,
            numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
            maxReputationBudget: maxReputationBudget,
            epochLength: epochLength,
            attestingFee: attestingFee
        }
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths, _settings)
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
        expectedUnirepEventsInOrder.push(unirepEvents.NewGSTLeafInserted)
        expectedSignUpEventsLength++
    })

    it('should publish a post by first user', async () => {
        currentEpoch = await unirepContract.currentEpoch()
       
        const publicSignals = [
            reputationNullifiers,
            currentEpoch,
            epochKey,
            genRandomSalt(),
            1,
            defaultPostReputation,
            0,
            0,
            0,
            proof
        ]

        const tx = await unirepSocialContract.publishPost(
            postId, 
            text, 
            publicSignals,
            { value: attestingFee, gasLimit: 1000000 }
        )
        const receipt = await tx.wait()
        expect(receipt.status, 'Submit post failed').to.equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.AttestationSubmitted)
        expectedPostEventsLength++
    })

    it('should sign up second user', async () => {
        const userId = genIdentity()
        const userCommitment = genIdentityCommitment(userId)
        userIds.push(userId)
        userCommitments.push(userCommitment)
        const tx = await unirepSocialContract.userSignUp(userCommitment)
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.NewGSTLeafInserted)
        expectedSignUpEventsLength++
    })

    it('should leave a comment by second user', async () => {
        let epochKeyNonce = 0
        const epochKey = genEpochKey(userIds[1].identityNullifier, currentEpoch, epochKeyNonce)

        const publicSignals = [
            reputationNullifiers,
            currentEpoch,
            epochKey,
            genRandomSalt(),
            1,
            defaultCommentReputation,
            0,
            0,
            0,
            proof
        ]
        const tx = await unirepSocialContract.leaveComment(
            postId, 
            commentId,
            text, 
            publicSignals,
            { value: attestingFee, gasLimit: 1000000 }
        )
        const receipt = await tx.wait()
        expect(receipt.status, 'Submit comment failed').to.equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.AttestationSubmitted)
        expectedCommentEventsLength++

        const proofNullifier = await unirepContract.hashReputationProof(publicSignals)
        proofIndex = await unirepContract.getProofIndex(proofNullifier)
    })
        
    it('first user should upvote second user', async () => {
        let upvoteValue = 3
        let epochKeyNonce = 1
        const fromEpochKey = genEpochKey(userIds[0].identityNullifier, currentEpoch, epochKeyNonce)
        const toEpochKey = genEpochKey(userIds[1].identityNullifier, currentEpoch, epochKeyNonce)

        const proofsRelated = [
            reputationNullifiers,
            currentEpoch,
            fromEpochKey,
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
            toEpochKey,
            proofIndex,
            proofsRelated,
            { value: attestingFee.mul(2), gasLimit: 1000000 }
        )
        const receipt = await tx.wait()
        expect(receipt.status, 'Submit upvote failed').to.equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.AttestationSubmitted)
        expectedUnirepEventsInOrder.push(unirepEvents.AttestationSubmitted)
        expectedVoteEventsLength++
    })

    it('first epoch ended', async () => {
        await hardhatEthers.provider.send("evm_increaseTime", [epochLength])  // Fast-forward epochLength of seconds
        const tx = await unirepContract.beginEpochTransition()
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

        tx = await unirepSocialContract.processAttestations(
            genRandomSalt(),
            genRandomSalt(),
            genRandomSalt(),
            proof,
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        tx = await unirepSocialContract.updateUserStateRoot([
            genRandomSalt(),
            epkNullifiers,
            transitionFromEpoch,
            blindedUserStates,
            genRandomSalt(),
            blindedHashChains,
            genRandomSalt(),
            proof,
        ], indexes)
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.NewGSTLeafInserted)
    })

    
    it('second epoch ended', async () => {
        await hardhatEthers.provider.send("evm_increaseTime", [epochLength])  // Fast-forward epochLength of seconds
        const tx = await unirepContract.beginEpochTransition()
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        currentEpoch = await unirepContract.currentEpoch()
        expectedUnirepEventsInOrder.push(unirepEvents.EpochEnded)
    })
    
    it('Third epoch ended', async () => {
        await hardhatEthers.provider.send("evm_increaseTime", [epochLength])  // Fast-forward epochLength of seconds
        const tx = await unirepContract.beginEpochTransition()
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

        tx = await unirepSocialContract.processAttestations(
            genRandomSalt(),
            genRandomSalt(),
            genRandomSalt(),
            proof,
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        tx = await unirepSocialContract.updateUserStateRoot([
            genRandomSalt(),
            epkNullifiers,
            transitionFromEpoch,
            blindedUserStates,
            genRandomSalt(),
            blindedHashChains,
            genRandomSalt(),
            proof,
        ], indexes)
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.NewGSTLeafInserted)
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

        tx = await unirepSocialContract.processAttestations(
            genRandomSalt(),
            genRandomSalt(),
            genRandomSalt(),
            proof,
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        tx = await unirepSocialContract.updateUserStateRoot([
            genRandomSalt(),
            epkNullifiers,
            transitionFromEpoch,
            blindedUserStates,
            genRandomSalt(),
            blindedHashChains,
            genRandomSalt(),
            proof,
        ], indexes)
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.NewGSTLeafInserted)
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