import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import { expect } from 'chai'
import mongoose from 'mongoose'
import { verifyProof, formatProofForVerifierContract } from "@unirep/circuits"
import { attestingFee, epochLength, numEpochKeyNoncePerEpoch, maxUsers, UserState, circuitGlobalStateTreeDepth, circuitEpochTreeDepth, circuitUserStateTreeDepth, genUserStateFromContract } from '@unirep/unirep'
import { deployUnirep } from '@unirep/contracts'
import { add0x, genIdentity, genIdentityCommitment, genRandomSalt, IncrementalQuinTree } from '@unirep/crypto'

import { dbUri } from '../../config/database';
import { genNewUserStateTree, getTreeDepthsForTesting } from '../utils'
import { defaultAirdroppedReputation, defaultCommentReputation, defaultPostReputation } from '../../config/socialMedia'
import { deployUnirepSocial } from '../../core/utils'
import Post, { IPost } from "../../database/models/post";
import Comment, { IComment } from '../../database/models/comment';
import { updateDBFromPostSubmittedEvent, updateDBFromCommentSubmittedEvent } from '../../database/utils'


describe('Post', function () {
    this.timeout(300000)

    let db
    let unirepContract
    let unirepSocialContract
    let GSTree
    let emptyUserStateRoot
    let id
    let commitment

    let accounts: ethers.Signer[]
    let results
    let postId
    let commentId
    const text = genRandomSalt().toString()
    const commentText = genRandomSalt().toString()
    let attesterId

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting('circuit')
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths)
        unirepSocialContract = await deployUnirepSocial(<ethers.Wallet>accounts[0], unirepContract.address)

        const blankGSLeaf = await unirepContract.hashedBlankStateLeaf()
        GSTree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)

        db = await mongoose.connect(
            dbUri, 
            { useNewUrlParser: true, 
              useFindAndModify: false, 
              useUnifiedTopology: true
            }
        )
    })

    it('should have the correct config value', async () => {
        const attestingFee_ = await unirepContract.attestingFee()
        expect(attestingFee).equal(attestingFee_)
        const epochLength_ = await unirepContract.epochLength()
        expect(epochLength).equal(epochLength_)
        const numEpochKeyNoncePerEpoch_ = await unirepContract.numEpochKeyNoncePerEpoch()
        expect(numEpochKeyNoncePerEpoch).equal(numEpochKeyNoncePerEpoch_)
        const maxUsers_ = await unirepContract.maxUsers()
        expect(maxUsers).equal(maxUsers_)

        const treeDepths_ = await unirepContract.treeDepths()
        expect(circuitEpochTreeDepth).equal(treeDepths_.epochTreeDepth)
        expect(circuitGlobalStateTreeDepth).equal(treeDepths_.globalStateTreeDepth)
        expect(circuitUserStateTreeDepth).equal(treeDepths_.userStateTreeDepth)

        const postReputation_ = await unirepSocialContract.postReputation()
        expect(postReputation_).equal(defaultPostReputation)
        const commentReputation_ = await unirepSocialContract.commentReputation()
        expect(commentReputation_).equal(defaultCommentReputation)
        const airdroppedReputation_ = await unirepSocialContract.airdroppedReputation()
        expect(airdroppedReputation_).equal(defaultAirdroppedReputation)
        const unirepAddress_ = await unirepSocialContract.unirep()
        expect(unirepAddress_).equal(unirepContract.address)

        attesterId = await unirepContract.attesters(unirepSocialContract.address)
        expect(attesterId).not.equal(0)
        const airdropAmount = await unirepContract.airdropAmount(unirepSocialContract.address)
        expect(airdropAmount).equal(defaultAirdroppedReputation)
    })

    it('should have the correct default value', async () => {
        const emptyUSTree = await genNewUserStateTree('circuit')
        emptyUserStateRoot = await unirepContract.emptyUserStateRoot()
        expect(BigNumber.from(emptyUSTree.getRootHash())).equal(emptyUserStateRoot)

        const emptyGlobalStateTreeRoot = await unirepContract.emptyGlobalStateTreeRoot()
        expect(BigNumber.from(GSTree.root)).equal(emptyGlobalStateTreeRoot)
    })

    describe('User sign-ups', () => {

        it('sign up should succeed', async () => {
            id = genIdentity()
            commitment = genIdentityCommitment(id) 
            
            const tx = await unirepSocialContract.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        })
    })

    describe('Generate reputation proof for verification', () => {

        it('reputation proof should be verified valid off-chain and on-chain', async() => {
            const userState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                0,
                id,
                commitment,
            )
            const proveGraffiti = BigInt(0)
            const minPosRep = BigInt(0), graffitiPreImage = BigInt(0)
            const epkNonce = 0
            results = await userState.genProveReputationProof(BigInt(attesterId), defaultPostReputation, epkNonce, minPosRep, proveGraffiti, graffitiPreImage)
            const isValid = await verifyProof('proveReputation', results.proof, results.publicSignals)
            expect(isValid, 'Verify reputation proof off-chain failed').to.be.true

            const isProofValid = await unirepContract.verifyReputation(
                results.reputationNullifiers,
                results.epoch,
                results.epochKey,
                results.globalStatetreeRoot,
                results.attesterId,
                results.proveReputationAmount,
                results.minRep,
                results.proveGraffiti,
                results.graffitiPreImage,
                formatProofForVerifierContract(results.proof)
            )
            expect(isProofValid, "proof is not valid").to.be.true
        })
    })

    describe('Publishing a post', () => {
        it('submit post should succeed', async() => {
            const publicSignals = [
                results.reputationNullifiers,
                results.epoch,
                results.epochKey,
                results.globalStatetreeRoot,
                results.attesterId,
                results.proveReputationAmount,
                results.minRep,
                results.proveGraffiti,
                results.graffitiPreImage,
                formatProofForVerifierContract(results.proof)
            ]

            const newPost: IPost = new Post({
                content: text,
                // TODO: hashedContent
                epochKey: results.epochKey,
                epoch: results.epoch,
                epkProof: formatProofForVerifierContract(results.proof).map((n)=>add0x(BigInt(n).toString(16))),
                minRep: Number(results.minRep),
                comments: [],
                status: 0
            });
            postId = add0x(newPost._id.toString())

            const tx = await unirepSocialContract.publishPost(
                postId, 
                text, 
                publicSignals,
                { value: attestingFee, gasLimit: 1000000 }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit post failed').to.equal(1)

            await newPost.save()
        })

        it('should find the post event from the contract and save the transaction hash', async() => {
            const postFilter = unirepSocialContract.filters.PostSubmitted()
            const postEvents =  await unirepSocialContract.queryFilter(postFilter)
            expect(postEvents.length).equal(1)

            await updateDBFromPostSubmittedEvent(postEvents[0])
        })
    })

    describe('Leave a comment', () => {
        it('reputation proof should be verified valid off-chain and on-chain', async() => {
            const userState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                0,
                id,
                commitment,
            )
            const proveGraffiti = BigInt(0)
            const minPosRep = BigInt(8), graffitiPreImage = BigInt(0)
            const epkNonce = 0
            results = await userState.genProveReputationProof(BigInt(attesterId), defaultCommentReputation, epkNonce, minPosRep, proveGraffiti, graffitiPreImage)
            const isValid = await verifyProof('proveReputation', results.proof, results.publicSignals)
            expect(isValid, 'Verify reputation proof off-chain failed').to.be.true

            const isProofValid = await unirepContract.verifyReputation(
                results.reputationNullifiers,
                results.epoch,
                results.epochKey,
                results.globalStatetreeRoot,
                results.attesterId,
                results.proveReputationAmount,
                results.minRep,
                results.proveGraffiti,
                results.graffitiPreImage,
                formatProofForVerifierContract(results.proof)
            )
            expect(isProofValid, "proof is not valid").to.be.true
        })

        it('submit comment should succeed', async() => {
            const publicSignals = [
                results.reputationNullifiers,
                results.epoch,
                results.epochKey,
                results.globalStatetreeRoot,
                results.attesterId,
                results.proveReputationAmount,
                results.minRep,
                results.proveGraffiti,
                results.graffitiPreImage,
                formatProofForVerifierContract(results.proof)
            ]

            const newComment: IComment = new Comment({
                postId: postId.toString(),
                content: commentText,
                epoch: results.epoch,
                // TODO: hashedContent
                epochKey: results.epochKey,
                epkProof: formatProofForVerifierContract(results.proof).map((n)=>add0x(BigInt(n).toString(16))),
                minRep: Number(results.minRep),
                status: 0
            });
            commentId = add0x(newComment._id.toString())

            const tx = await unirepSocialContract.leaveComment(
                postId, 
                commentId,
                commentText, 
                publicSignals,
                { value: attestingFee, gasLimit: 1000000 }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit comment failed').to.equal(1)

            const res = await newComment.save()
            expect(res).not.equal(null)
        })

        it('should find the comment event from the contract and save the transaction hash', async() => {
            const commentFilter = unirepSocialContract.filters.CommentSubmitted()
            const commentEvents =  await unirepSocialContract.queryFilter(commentFilter)
            expect(commentEvents.length).equal(1)

            await updateDBFromCommentSubmittedEvent(commentEvents[0])
        })
    })
})