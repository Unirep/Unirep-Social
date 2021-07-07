import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import chai from "chai"
import { attestingFee, circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitNullifierTreeDepth, circuitUserStateTreeDepth, epochLength, numAttestationsPerEpochKey, numEpochKeyNoncePerEpoch } from '../../config/testLocal'
import { genRandomSalt } from '../../crypto/crypto'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { deployUnirep, genEpochKey, getTreeDepthsForTesting } from '../utils'

const { expect } = chai

import UnirepSocial from "../../artifacts/contracts/UnirepSocial.sol/UnirepSocial.json"
import { Attestation, UnirepState, UserState } from "../../core"
import { DEFAULT_AIRDROPPED_KARMA, DEFAULT_POST_KARMA, MAX_KARMA_BUDGET } from '../../config/socialMedia'
import { deployUnirepSocial } from '../../core/utils'
import { IncrementalQuinTree, stringifyBigInts } from 'maci-crypto'
import { formatProofForVerifierContract, genVerifyReputationProofAndPublicSignals, verifyProveReputationProof } from '../../circuits/utils'
import { getSignalByNameViaSym } from '../circuits/utils'


describe('EventSequencing', function (){
    this.timeout(600000)
    
    enum unirepEvents { 
        UserSignUp,
        AttestationSubmitted,
        ReputationNullifierSubmitted,
        EpochEnded,
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

    let currentEpoch
    let GSTree
    let GSTreeLeafIndex: number = 0
    let emptyUserStateRoot
    let unirepState
    let users: any[] = []
    let userIds: any[] = [], userCommitments: any[] = []
    const postId = genRandomSalt()
    const commentId = genRandomSalt()

    let attester, attesterAddress, attesterId, attesterSig, contractCalledByAttester

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

    it('should sign up attester', async () => {
        attester = accounts[1]
        attesterAddress = await attester.getAddress()
        contractCalledByAttester = await hardhatEthers.getContractAt(UnirepSocial.abi, unirepSocialContract.address, attester)
        const message = ethers.utils.solidityKeccak256(["address", "address"], [attesterAddress, unirepContract.address])
        attesterSig = await attester.signMessage(ethers.utils.arrayify(message))
        const tx = await contractCalledByAttester.attesterSignUp(attesterSig)
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        attesterId = await unirepContract.attesters(attesterAddress)
    })

    it('should publish a post by first user', async () => {
        let epochKeyNonce = 0

        currentEpoch = await unirepContract.currentEpoch()
        emptyUserStateRoot = await unirepContract.emptyUserStateRoot()
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

        const hashedStateLeaf = await unirepContract.hashStateLeaf(
            [
                userCommitments[0],
                emptyUserStateRoot,
                BigInt(DEFAULT_AIRDROPPED_KARMA),
                BigInt(0)
            ]
        )
        const blankGSLeaf = await unirepContract.hashedBlankStateLeaf()
        GSTree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)
        GSTree.insert(hashedStateLeaf)

        unirepState.signUp(currentEpoch.toNumber(), BigInt(hashedStateLeaf))
        const userState = new UserState(
            unirepState,
            userIds[0],
            userCommitments[0],
            false
        )
        users.push(userState)
        users[0].signUp(currentEpoch, GSTreeLeafIndex)
        GSTreeLeafIndex ++

        const circuitInputs = await users[0].genProveReputationCircuitInputs(
            epochKeyNonce,
            DEFAULT_POST_KARMA,
            0
        )
        
        const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
        const isValid = await verifyProveReputationProof(results['proof'], results['publicSignals'])
        expect(isValid, 'reputation proof is not valid').to.be.true

        const proof = formatProofForVerifierContract(results['proof'])
        const epochKey = getSignalByNameViaSym('proveReputation', results['witness'], 'main.epoch_key')
        const nullifiers = results['publicSignals'].slice(0, MAX_KARMA_BUDGET)
        const publicSignals = results['publicSignals'].slice(MAX_KARMA_BUDGET+2)
        
        const tx = await unirepSocialContract.publishPost(
            postId, 
            epochKey,
            'postText', 
            nullifiers,
            publicSignals, 
            proof,
            { value: attestingFee, gasLimit: 1000000 }
        )
        const receipt = await tx.wait()
        expect(receipt.status, 'Submit post failed').to.equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.AttestationSubmitted)
        expectedUnirepEventsInOrder.push(unirepEvents.ReputationNullifierSubmitted)
        expectedPostEventsLength++

        for (let i = 0; i < MAX_KARMA_BUDGET; i++) {
            const modedNullifier = BigInt(nullifiers[i]) % BigInt(2 ** unirepState.nullifierTreeDepth)
            unirepState.addKarmaNullifiers(modedNullifier)
        }
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
        const hashedStateLeaf = await unirepContract.hashStateLeaf(
            [
                userCommitments[1],
                emptyUserStateRoot,
                BigInt(DEFAULT_AIRDROPPED_KARMA),
                BigInt(0)
            ]
        )
        GSTree.insert(hashedStateLeaf)

        unirepState.signUp(currentEpoch.toNumber(), BigInt(hashedStateLeaf))
        const user2State = new UserState(
            unirepState,
            userIds[1],
            userCommitments[1],
            false
        )
        users.push(user2State)
        users[1].signUp(currentEpoch, GSTreeLeafIndex)
        GSTreeLeafIndex ++

        let epochKeyNonce = 0

        const circuitInputs = await users[1].genProveReputationCircuitInputs(
            epochKeyNonce,
            DEFAULT_POST_KARMA,
            0
        )
        
        const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
        const isValid = await verifyProveReputationProof(results['proof'], results['publicSignals'])
        expect(isValid, 'reputation proof is not valid').to.be.true

        const proof = formatProofForVerifierContract(results['proof'])
        const epochKey = getSignalByNameViaSym('proveReputation', results['witness'], 'main.epoch_key')
        const nullifiers = results['publicSignals'].slice(0, MAX_KARMA_BUDGET)
        const publicSignals = results['publicSignals'].slice(MAX_KARMA_BUDGET+2)
        
        const tx = await unirepSocialContract.leaveComment(
            postId,
            commentId, 
            epochKey,
            'commentText',
            nullifiers,
            publicSignals,
            proof,
            { value: attestingFee, gasLimit: 1000000 }
        )
        const receipt = await tx.wait()
        expect(receipt.status, 'Submit comment failed').to.equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.AttestationSubmitted)
        expectedUnirepEventsInOrder.push(unirepEvents.ReputationNullifierSubmitted)
        expectedCommentEventsLength++

        for (let i = 0; i < MAX_KARMA_BUDGET; i++) {
            const modedNullifier = BigInt(nullifiers[i]) % BigInt(2 ** unirepState.nullifierTreeDepth)
            unirepState.addKarmaNullifiers(modedNullifier)
        }
    })
        
    it('first user should upvote second user', async () => {
        let voteValue = 3
        let epochKeyNonce = 1
        const epochKey = genEpochKey(userIds[1].identityNullifier, currentEpoch, epochKeyNonce)

        let attestation = new Attestation(
            BigInt(attesterId),
            BigInt(voteValue),
            BigInt(0),
            genRandomSalt(),
            true,
        )

        const circuitInputs = await users[0].genProveReputationCircuitInputs(
            epochKeyNonce,
            DEFAULT_POST_KARMA,
            0
        )
        
        const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
        const isValid = await verifyProveReputationProof(results['proof'], results['publicSignals'])
        expect(isValid, 'reputation proof is not valid').to.be.true

        const proof = formatProofForVerifierContract(results['proof'])
        const fromEpochKey = getSignalByNameViaSym('proveReputation', results['witness'], 'main.epoch_key')
        const nullifiers = results['publicSignals'].slice(0, MAX_KARMA_BUDGET)
        const publicSignals = results['publicSignals'].slice(MAX_KARMA_BUDGET+2)
        
        const tx = await contractCalledByAttester.vote(
            attesterSig,
            attestation,
            epochKey,
            fromEpochKey,
            nullifiers,
            publicSignals,
            proof,
            { value: attestingFee, gasLimit: 1000000 }
        )
        const receipt = await tx.wait()
        expect(receipt.status, 'Submit upvote failed').to.equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.AttestationSubmitted)
        expectedUnirepEventsInOrder.push(unirepEvents.ReputationNullifierSubmitted)
        expectedUnirepEventsInOrder.push(unirepEvents.AttestationSubmitted)
        expectedVoteEventsLength++

        for (let i = 0; i < MAX_KARMA_BUDGET; i++) {
            const modedNullifier = BigInt(nullifiers[i]) % BigInt(2 ** unirepState.nullifierTreeDepth)
            unirepState.addKarmaNullifiers(modedNullifier)
        }
    })

    it('first epoch ended', async () => {
        let currentEpoch = unirepContract.currentEpoch()
        let numEpochKey = await unirepContract.getNumEpochKey(currentEpoch)
        await hardhatEthers.provider.send("evm_increaseTime", [epochLength])  // Fast-forward epochLength of seconds
        const tx = await unirepSocialContract.beginEpochTransition(numEpochKey)
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        currentEpoch = await unirepContract.currentEpoch()
        expectedUnirepEventsInOrder.push(unirepEvents.EpochEnded)
    })

    it('Second user should perform transition', async () => {
        let transitionFromEpoch = 1
        const numAttestationsPerEpoch = numEpochKeyNoncePerEpoch * numAttestationsPerEpochKey
        const attestationNullifiers: BigInt[] = []
        for (let i = 0; i < numAttestationsPerEpoch; i++) {
            attestationNullifiers.push(BigInt(16 + i))
        }
        const epkNullifiers: BigInt[] = []
        for (let i = 0; i < numEpochKeyNoncePerEpoch; i++) {
            epkNullifiers.push(BigInt(255))
        }
        const proof: BigInt[] = []
        for (let i = 0; i < 8; i++) {
            proof.push(BigInt(0))
        }
        const tx = await unirepContract.updateUserStateRoot(
            genRandomSalt(),
            attestationNullifiers,
            epkNullifiers,
            transitionFromEpoch,
            genRandomSalt(),
            genRandomSalt(),
            genRandomSalt(),
            proof,
        )
        const receipt = await tx.wait()
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
        const transitionFromEpoch = 1
        const numAttestationsPerEpoch = numEpochKeyNoncePerEpoch * numAttestationsPerEpochKey
        const attestationNullifiers: BigInt[] = []
        for (let i = 0; i < numAttestationsPerEpoch; i++) {
            attestationNullifiers.push(BigInt(16 + i))
        }
        const epkNullifiers: BigInt[] = []
        for (let i = 0; i < numEpochKeyNoncePerEpoch; i++) {
            epkNullifiers.push(BigInt(255))
        }
        const proof: BigInt[] = []
        for (let i = 0; i < 8; i++) {
            proof.push(BigInt(0))
        }
        const tx = await unirepContract.updateUserStateRoot(
            genRandomSalt(),
            attestationNullifiers,
            epkNullifiers,
            transitionFromEpoch,
            genRandomSalt(),
            genRandomSalt(),
            genRandomSalt(),
            proof,
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedUnirepEventsInOrder.push(unirepEvents.UserStateTransitioned)
    })

    it('Second user should perform transition', async () => {
        const transitionFromEpoch = 1
        const numAttestationsPerEpoch = numEpochKeyNoncePerEpoch * numAttestationsPerEpochKey
        const attestationNullifiers: BigInt[] = []
        for (let i = 0; i < numAttestationsPerEpoch; i++) {
            attestationNullifiers.push(BigInt(16 + i))
        }
        const epkNullifiers: BigInt[] = []
        for (let i = 0; i < numEpochKeyNoncePerEpoch; i++) {
            epkNullifiers.push(BigInt(255))
        }
        const proof: BigInt[] = []
        for (let i = 0; i < 8; i++) {
            proof.push(BigInt(0))
        }
        const tx = await unirepContract.updateUserStateRoot(
            genRandomSalt(),
            attestationNullifiers,
            epkNullifiers,
            transitionFromEpoch,
            genRandomSalt(),
            genRandomSalt(),
            genRandomSalt(),
            proof,
        )
        const receipt = await tx.wait()
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