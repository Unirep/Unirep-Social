import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import chai from "chai"
import { attestingFee, epochLength, circuitEpochTreeDepth, circuitGlobalStateTreeDepth, numEpochKeyNoncePerEpoch, maxUsers, circuitNullifierTreeDepth, numAttestationsPerEpochKey, circuitUserStateTreeDepth} from '../../config/testLocal'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { genRandomSalt, IncrementalQuinTree, stringifyBigInts } from 'maci-crypto'
import { deployUnirep, genEpochKey, genNewUserStateTree, getTreeDepthsForTesting } from '../utils'
import { deployUnirepSocial } from '../../core/utils'

const { expect } = chai

import UnirepSocial from "../../artifacts/contracts/UnirepSocial.sol/UnirepSocial.json"
import { DEFAULT_AIRDROPPED_KARMA, DEFAULT_COMMENT_KARMA, DEFAULT_POST_KARMA, MAX_KARMA_BUDGET } from '../../config/socialMedia'
import { UnirepState, UserState } from '../../core'
import {  formatProofForVerifierContract, genVerifyReputationProofAndPublicSignals, verifyProveReputationProof } from '../circuits/utils'
import { DEFAULT_ETH_PROVIDER } from '../../cli/defaults'


describe('Post', function () {
    this.timeout(300000)

    let circuit
    let unirepContract
    let unirepSocialContract
    let GSTree
    let emptyUserStateRoot
    const ids = new Array(2)
    const commitments = new Array(2)
    let users: UserState[] = new Array(2)
    let unirepState
    
    let accounts: ethers.Signer[]
    let provider

    const epochKeyNonce = 0
    let proof
    let publicSignals
    let nullifiers
    let circuitInputs
    const postId = genRandomSalt()
    const commentId = genRandomSalt()
    const text = genRandomSalt().toString()
    
    before(async () => {
        accounts = await hardhatEthers.getSigners()
        provider = new hardhatEthers.providers.JsonRpcProvider(DEFAULT_ETH_PROVIDER)

        const _treeDepths = getTreeDepthsForTesting('circuit')
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths)
        unirepSocialContract = await deployUnirepSocial(<ethers.Wallet>accounts[0], unirepContract.address)

        const blankGSLeaf = await unirepContract.hashedBlankStateLeaf()
        GSTree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)
    })

    it('should have the correct config value', async () => {
        const attestingFee_ = await unirepContract.attestingFee()
        expect(attestingFee).equal(attestingFee_)
        const epochLength_ = await unirepContract.epochLength()
        expect(epochLength).equal(epochLength_)
        const numAttestationsPerEpochKey_ = await unirepContract.numAttestationsPerEpochKey()
        expect(numAttestationsPerEpochKey).equal(numAttestationsPerEpochKey_)
        const numEpochKeyNoncePerEpoch_ = await unirepContract.numEpochKeyNoncePerEpoch()
        expect(numEpochKeyNoncePerEpoch).equal(numEpochKeyNoncePerEpoch_)
        const numAttestationsPerEpoch_ = await unirepContract.numAttestationsPerEpoch()
        expect(numEpochKeyNoncePerEpoch * numAttestationsPerEpochKey).equal(numAttestationsPerEpoch_)
        const maxUsers_ = await unirepContract.maxUsers()
        expect(maxUsers).equal(maxUsers_)

        const treeDepths_ = await unirepContract.treeDepths()
        expect(circuitEpochTreeDepth).equal(treeDepths_.epochTreeDepth)
        expect(circuitGlobalStateTreeDepth).equal(treeDepths_.globalStateTreeDepth)
        expect(circuitNullifierTreeDepth).equal(treeDepths_.nullifierTreeDepth)
        expect(circuitUserStateTreeDepth).equal(treeDepths_.userStateTreeDepth)

        const postReputation_ = await unirepSocialContract.postReputation()
        expect(postReputation_).equal(DEFAULT_POST_KARMA)
        const commentReputation_ = await unirepSocialContract.commentReputation()
        expect(commentReputation_).equal(DEFAULT_COMMENT_KARMA)
        const airdroppedReputation_ = await unirepSocialContract.airdroppedReputation()
        expect(airdroppedReputation_).equal(DEFAULT_AIRDROPPED_KARMA)
        const unirepAddress_ = await unirepSocialContract.unirep()
        expect(unirepAddress_).equal(unirepContract.address)
    })

    it('should have the correct default value', async () => {
        const emptyUSTree = await genNewUserStateTree()
        emptyUserStateRoot = await unirepContract.emptyUserStateRoot()
        expect(BigNumber.from(emptyUSTree.getRootHash())).equal(emptyUserStateRoot)

        const emptyGlobalStateTreeRoot = await unirepContract.emptyGlobalStateTreeRoot()
        expect(BigNumber.from(GSTree.root)).equal(emptyGlobalStateTreeRoot)
    })

    describe('User sign-ups', () => {

        it('sign up should succeed', async () => {
            let GSTreeLeafIndex: number = -1
            const currentEpoch = await unirepContract.currentEpoch()
            unirepState = new UnirepState(
                circuitGlobalStateTreeDepth,
                circuitUserStateTreeDepth,
                circuitEpochTreeDepth,
                circuitNullifierTreeDepth,
                attestingFee,
                epochLength,
                numEpochKeyNoncePerEpoch,
                numAttestationsPerEpochKey,
            )
            for (let i = 0; i < 2; i++) {
                ids[i] = genIdentity()
                commitments[i] = genIdentityCommitment(ids[i])
                const tx = await unirepSocialContract.userSignUp(commitments[i])
                const receipt = await tx.wait()

                expect(receipt.status).equal(1)

                const numUserSignUps_ = await unirepContract.numUserSignUps()
                expect(i+1).equal(numUserSignUps_)

                const hashedStateLeaf = await unirepContract.hashStateLeaf(
                    [
                        commitments[i],
                        emptyUserStateRoot,
                        BigInt(DEFAULT_AIRDROPPED_KARMA),
                        BigInt(0)
                    ]
                )
                GSTree.insert(hashedStateLeaf)

                unirepState.signUp(currentEpoch.toNumber(), BigInt(hashedStateLeaf))
                users[i] = new UserState(
                    unirepState,
                    ids[i],
                    commitments[i],
                    false
                )

                const latestTransitionedToEpoch = currentEpoch.toNumber()
                const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
                const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
                

                for (let j = 0; j < newLeafEvents.length; j++) {
                    if(BigInt(newLeafEvents[j]?.args?._hashedLeaf) == BigInt(hashedStateLeaf)){
                        GSTreeLeafIndex = newLeafEvents[j]?.args?._leafIndex.toNumber()
                    }
                }
                expect(GSTreeLeafIndex).to.equal(i)
            
                users[i].signUp(latestTransitionedToEpoch, GSTreeLeafIndex)
            }
        })
    })

    describe('Generate reputation proof for verification', () => {

        it('reputation proof should be verified valid off-chain and on-chain', async() => {
            circuitInputs = await users[0].genProveReputationCircuitInputs(
                epochKeyNonce,
                DEFAULT_POST_KARMA,
                0
            )

            const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
            proof = results['proof']
            publicSignals = results['publicSignals']
            const isValid = await verifyProveReputationProof(proof, publicSignals)
            expect(isValid, "proof is not valid").to.be.true
            
            const currentEpoch = (await unirepContract.currentEpoch()).toNumber()
            const epochKey = genEpochKey(ids[0].identityNullifier, currentEpoch, epochKeyNonce)
            nullifiers = results['publicSignals'].slice(0, MAX_KARMA_BUDGET)
            publicSignals = results['publicSignals'].slice(MAX_KARMA_BUDGET+2)
            const isProofValid = await unirepSocialContract.verifyReputation(
                nullifiers,
                currentEpoch,
                epochKey,
                publicSignals,
                formatProofForVerifierContract(proof)
            )
            expect(isProofValid, "proof is not valid").to.be.true
        })
    })

    describe('Publishing a post', () => {
        it('submit post should succeed', async() => {
            const currentEpoch = (await unirepContract.currentEpoch()).toNumber()
            const epochKeyNonce = 0
            const epk = genEpochKey(ids[0].identityNullifier, currentEpoch, epochKeyNonce)

            const tx = await unirepSocialContract.publishPost(
                postId, 
                epk,
                text, 
                nullifiers,
                publicSignals, 
                formatProofForVerifierContract(proof),
                { value: attestingFee, gasLimit: 1000000 }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit post failed').to.equal(1)

            for (let i = 0; i < MAX_KARMA_BUDGET; i++) {
                const modedNullifier = BigInt(nullifiers[i]) % BigInt(2 ** unirepState.nullifierTreeDepth)
                unirepState.addKarmaNullifiers(modedNullifier)
            }
        })

        it('submit a post with duplicated nullifiers should fail', async() => {
            const text = genRandomSalt().toString()
            const currentEpoch = (await unirepContract.currentEpoch()).toNumber()
            const epochKeyNonce = 0
            const epk = genEpochKey(ids[0].identityNullifier, currentEpoch, epochKeyNonce)

            const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
            proof = results['proof']
            publicSignals = results['publicSignals']
            const isValid = await verifyProveReputationProof(proof, publicSignals)
            expect(isValid, "proof is not valid").to.be.true

            nullifiers = results['publicSignals'].slice(0, MAX_KARMA_BUDGET)
            publicSignals = results['publicSignals'].slice(MAX_KARMA_BUDGET+2)
            const isProofValid = await unirepSocialContract.verifyReputation(
                nullifiers,
                currentEpoch,
                epk,
                publicSignals,
                formatProofForVerifierContract(proof)
            )
            expect(isProofValid, "proof is not valid").to.be.true

            await expect(unirepSocialContract.publishPost(
                postId, 
                epk,
                text, 
                nullifiers,
                publicSignals, 
                formatProofForVerifierContract(proof),
                { value: attestingFee, gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep: the nullifier has been submitted')
        })

        it('submit a post with invalid proof should fail', async() => {
            const currentEpoch = (await unirepContract.currentEpoch()).toNumber()
            const epochKeyNonce = 0
            const epk = genEpochKey(ids[0].identityNullifier, currentEpoch, epochKeyNonce)
            // use minRep to make the proof invalid
            const minRep = 30
            circuitInputs = await users[0].genProveReputationCircuitInputs(
                epochKeyNonce,
                DEFAULT_POST_KARMA,
                minRep
            )

            const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
            proof = results['proof']
            publicSignals = results['publicSignals']
            const isValid = await verifyProveReputationProof(proof, publicSignals)
            expect(isValid, "proof is valid").to.be.false
            
            nullifiers = results['publicSignals'].slice(0, MAX_KARMA_BUDGET)
            publicSignals = results['publicSignals'].slice(MAX_KARMA_BUDGET+2)
            const isProofValid = await unirepSocialContract.verifyReputation(
                nullifiers,
                currentEpoch,
                epk,
                publicSignals,
                formatProofForVerifierContract(proof)
            )
            expect(isProofValid, "proof is valid").to.be.false

            await expect(unirepSocialContract.publishPost(
                postId, 
                epk,
                text, 
                nullifiers,
                publicSignals, 
                formatProofForVerifierContract(proof),
                { value: attestingFee, gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep: the proof is not valid')
        })
    })

    describe('Comment a post', () => {
        const epochKeyNonce = 0
        it('reputation proof should be verified valid off-chain and on-chain', async() => {
            circuitInputs = await users[1].genProveReputationCircuitInputs(
                epochKeyNonce,
                DEFAULT_COMMENT_KARMA,
                0
            )

            const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
            proof = results['proof']
            publicSignals = results['publicSignals']
            const isValid = await verifyProveReputationProof(proof, publicSignals)
            expect(isValid, "proof is not valid").to.be.true
            
            const currentEpoch = (await unirepContract.currentEpoch()).toNumber()
            const epochKey = genEpochKey(ids[1].identityNullifier, currentEpoch, epochKeyNonce)
            nullifiers = results['publicSignals'].slice(0, MAX_KARMA_BUDGET)
            publicSignals = results['publicSignals'].slice(MAX_KARMA_BUDGET+2)
            const isProofValid = await unirepSocialContract.verifyReputation(
                nullifiers,
                currentEpoch,
                epochKey,
                publicSignals,
                formatProofForVerifierContract(proof)
            )
            expect(isProofValid, "proof is not valid").to.be.true
        })

        it('submit comment should succeed', async() => {
            const currentEpoch = (await unirepContract.currentEpoch()).toNumber()
            const epk = genEpochKey(ids[1].identityNullifier, currentEpoch, epochKeyNonce)

            const tx = await unirepSocialContract.leaveComment(
                postId, 
                commentId,
                epk,
                text, 
                nullifiers,
                publicSignals, 
                formatProofForVerifierContract(proof),
                { value: attestingFee, gasLimit: 1000000 }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit comment failed').to.equal(1)

            for (let i = 0; i < MAX_KARMA_BUDGET; i++) {
                const modedNullifier = BigInt(nullifiers[i]) % BigInt(2 ** unirepState.nullifierTreeDepth)
                unirepState.addKarmaNullifiers(modedNullifier)
            }
        })

        it('submit a comment with duplicated nullifiers should fail', async() => {
            const text = genRandomSalt().toString()
            const currentEpoch = (await unirepContract.currentEpoch()).toNumber()
            const epk = genEpochKey(ids[1].identityNullifier, currentEpoch, epochKeyNonce)

            const isProofValid = await unirepSocialContract.verifyReputation(
                nullifiers,
                currentEpoch,
                epk,
                publicSignals,
                formatProofForVerifierContract(proof)
            )
            expect(isProofValid, "proof is not valid").to.be.true

            await expect(unirepSocialContract.leaveComment(
                postId, 
                commentId,
                epk,
                text, 
                nullifiers,
                publicSignals, 
                formatProofForVerifierContract(proof),
                { value: attestingFee, gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep: the nullifier has been submitted')
        })

        it('submit a comment with invalid proof should fail', async() => {
            const currentEpoch = (await unirepContract.currentEpoch()).toNumber()
            const epochKeyNonce = 0
            const epk = genEpochKey(ids[1].identityNullifier, currentEpoch, epochKeyNonce)
            // use minRep to make the proof invalid
            const minRep = 30
            circuitInputs = await users[1].genProveReputationCircuitInputs(
                epochKeyNonce,
                DEFAULT_COMMENT_KARMA,
                minRep
            )

            const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
            proof = results['proof']
            publicSignals = results['publicSignals']
            const isValid = await verifyProveReputationProof(proof, publicSignals)
            expect(isValid, "proof is valid").to.be.false

            nullifiers = results['publicSignals'].slice(0, MAX_KARMA_BUDGET)
            publicSignals = results['publicSignals'].slice(MAX_KARMA_BUDGET+2)
            const isProofValid = await unirepSocialContract.verifyReputation(
                nullifiers,
                currentEpoch,
                epk,
                publicSignals,
                formatProofForVerifierContract(proof)
            )
            expect(isProofValid, "proof is valid").to.be.false

            await expect(unirepSocialContract.leaveComment(
                postId, 
                commentId,
                epk,
                text, 
                nullifiers,
                publicSignals, 
                formatProofForVerifierContract(proof),
                { value: attestingFee, gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep: the proof is not valid')
        })
    })
})