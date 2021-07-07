import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import chai from "chai"
import { attestingFee, epochLength, circuitEpochTreeDepth, circuitGlobalStateTreeDepth, numEpochKeyNoncePerEpoch, maxUsers, circuitNullifierTreeDepth, numAttestationsPerEpochKey, circuitUserStateTreeDepth} from '../../config/testLocal'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { genRandomSalt, IncrementalQuinTree, stringifyBigInts } from 'maci-crypto'
import { deployUnirep, genEpochKey, genNewUserStateTree, getTreeDepthsForTesting } from '../utils'

const { expect } = chai

import UnirepSocial from "../../artifacts/contracts/UnirepSocial.sol/UnirepSocial.json"
import { DEFAULT_AIRDROPPED_KARMA, DEFAULT_COMMENT_KARMA, DEFAULT_POST_KARMA, MAX_KARMA_BUDGET } from '../../config/socialMedia'
import { Attestation, UnirepState, UserState } from '../../core'
import {  formatProofForVerifierContract, genVerifyReputationProofAndPublicSignals, verifyProveReputationProof } from '../circuits/utils'
import { deployUnirepSocial } from '../../core/utils'


describe('Vote', function () {
    this.timeout(300000)

    let unirepContract
    let unirepSocialContract
    let GSTree
    let emptyUserStateRoot
    let userNum = 4
    const ids = new Array(userNum)
    const commitments = new Array(userNum)
    let users: UserState[] = new Array(userNum)
    let unirepState
    let attesters = new Array(userNum)
    let attesterAddresses = new Array(userNum)
    let attesterSigs = new Array(userNum)
    
    let accounts: ethers.Signer[]
    let contractCalledByAttesters = new Array(userNum)

    let proof
    let publicSignals
    let nullifiers
    const epochKeyNonce = 0
    const epochKeyNonce2 = 1
    let fromEpk
    let toEpk
    let attesterId 
    let upvoteValue = 3
    let downvoteValue = 5
    const graffiti = genRandomSalt()
    const overwriteGraffiti = true
    let attestation
    
    before(async () => {
        accounts = await hardhatEthers.getSigners()

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
            for (let i = 0; i < userNum; i++) {
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

        it('sign up should succeed', async () => {
            for (let i = 0; i < userNum; i++) {
                attesters[i] = accounts[i+1]
                attesterAddresses[i] = await attesters[i].getAddress()
                contractCalledByAttesters[i] = await hardhatEthers.getContractAt(UnirepSocial.abi, unirepSocialContract.address, attesters[i])
                const message = ethers.utils.solidityKeccak256(["address", "address"], [attesterAddresses[i], unirepContract.address])
                attesterSigs[i] = await attesters[i].signMessage(ethers.utils.arrayify(message))
                const tx = await contractCalledByAttesters[i].attesterSignUp(attesterSigs[i])
                const receipt = await tx.wait()

                expect(receipt.status).equal(1)

                const attesterId = await unirepContract.attesters(attesterAddresses[i])
                expect(i+2).equal(attesterId)
                const nextAttesterId_ = await unirepContract.nextAttesterId()
                // nextAttesterId starts with 1 so now it should be 2
                expect(i+3).equal(nextAttesterId_)
            }
        })
    })

    describe('Generate reputation proof for verification', () => {

        it('reputation proof should be verified valid off-chain and on-chain', async() => {
            const circuitInputs = await users[0].genProveReputationCircuitInputs(
                epochKeyNonce,
                upvoteValue,
                0
            )

            const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
            const isValid = await verifyProveReputationProof(results['proof'], results['publicSignals'])
            expect(isValid, "proof is not valid").to.be.true

            const currentEpoch = (await unirepContract.currentEpoch()).toNumber()
            const epochKey = genEpochKey(ids[0].identityNullifier, currentEpoch, epochKeyNonce)
            proof = results['proof']
            nullifiers = results['publicSignals'].slice(0, MAX_KARMA_BUDGET)
            publicSignals = results['publicSignals'].slice(MAX_KARMA_BUDGET+2)

            const isProofValid = await unirepContract.verifyReputation(
                nullifiers,
                currentEpoch,
                epochKey,
                publicSignals,
                formatProofForVerifierContract(proof)
            )
            expect(isProofValid, "proof is not valid").to.be.true
        })
    })

    // user 1 and user 2
    describe('Upvote', () => {
        let currentEpoch
        attesterId = 2
        attestation = new Attestation(
            BigInt(attesterId),
            BigInt(upvoteValue),
            BigInt(0),
            graffiti,
            overwriteGraffiti,
        )
        const fromUser = 0
        const toUser = 1

        it('submit upvote should succeed', async() => {
            currentEpoch = (await unirepContract.currentEpoch()).toNumber()

            fromEpk = genEpochKey(ids[fromUser].identityNullifier, currentEpoch, epochKeyNonce)

            toEpk = genEpochKey(ids[toUser].identityNullifier, currentEpoch, epochKeyNonce)

            const tx = await contractCalledByAttesters[fromUser].vote(
                attesterSigs[fromUser],
                attestation, 
                toEpk,
                fromEpk, 
                nullifiers,
                publicSignals, 
                formatProofForVerifierContract(proof),
                { value: attestingFee, gasLimit: 1000000 }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit vote failed').to.equal(1)
        })

        it('submit upvote with duplicated nullifiers should fail', async() => {
            
            fromEpk = genEpochKey(ids[fromUser].identityNullifier, currentEpoch, epochKeyNonce, circuitEpochTreeDepth)

            toEpk = genEpochKey(ids[toUser].identityNullifier, currentEpoch, epochKeyNonce2, circuitEpochTreeDepth)

            const circuitInputs = await users[fromUser].genProveReputationCircuitInputs(
                epochKeyNonce,
                upvoteValue,
                0
            )

            const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
            const isValid = await verifyProveReputationProof(results['proof'], results['publicSignals'])
            expect(isValid, "proof is not valid").to.be.true
            
            proof = results['proof']
            nullifiers = results['publicSignals'].slice(0, MAX_KARMA_BUDGET)
            publicSignals = results['publicSignals'].slice(MAX_KARMA_BUDGET+2)
            const isProofValid = await unirepContract.verifyReputation(
                nullifiers,
                currentEpoch,
                fromEpk,
                publicSignals,
                formatProofForVerifierContract(proof)
            )
            expect(isProofValid, "proof is not valid").to.be.true

            await expect(contractCalledByAttesters[fromUser].vote(
                attesterSigs[fromUser],
                attestation, 
                toEpk,
                fromEpk, 
                nullifiers,
                publicSignals, 
                formatProofForVerifierContract(proof),
                { value: attestingFee, gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep: the nullifier has been submitted')

            for (let i = 0; i < MAX_KARMA_BUDGET; i++) {
                const modedNullifier = BigInt(nullifiers[i]) % BigInt(2 ** unirepState.nullifierTreeDepth)
                unirepState.addKarmaNullifiers(modedNullifier)
            }
        })

        it('submit upvote with invalid proof should fail', async() => {

            fromEpk = genEpochKey(ids[fromUser].identityNullifier, currentEpoch, epochKeyNonce2, circuitEpochTreeDepth)

            toEpk = genEpochKey(ids[toUser].identityNullifier, currentEpoch, epochKeyNonce2, circuitEpochTreeDepth)
            
            const minRep = 21
            const circuitInputs = await users[fromUser].genProveReputationCircuitInputs(
                epochKeyNonce2,
                upvoteValue,
                minRep
            )

            const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
            const isValid = await verifyProveReputationProof(results['proof'], results['publicSignals'])
            expect(isValid, "proof is valid").to.be.false
            
            proof = results['proof']
            nullifiers = results['publicSignals'].slice(0, MAX_KARMA_BUDGET)
            publicSignals = results['publicSignals'].slice(MAX_KARMA_BUDGET+2)
            const isProofValid = await unirepContract.verifyReputation(
                nullifiers,
                currentEpoch,
                fromEpk,
                publicSignals,
                formatProofForVerifierContract(proof)
            )
            expect(isProofValid, "proof is valid").to.be.false

            await expect(contractCalledByAttesters[fromUser].vote(
                attesterSigs[fromUser],
                attestation, 
                toEpk,
                fromEpk, 
                nullifiers,
                publicSignals, 
                formatProofForVerifierContract(proof),
                { value: attestingFee, gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep: the proof is not valid')
        })

        it('submit vote with 0 value should fail', async() => {

            const zeroAttestation = new Attestation(
                BigInt(attesterId),
                BigInt(0),
                BigInt(0),
                graffiti,
                overwriteGraffiti,
            )

            await expect(contractCalledByAttesters[fromUser].vote(
                attesterSigs[fromUser],
                zeroAttestation, 
                toEpk,
                fromEpk, 
                nullifiers,
                publicSignals, 
                formatProofForVerifierContract(proof),
                { value: attestingFee, gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep Social: should submit a positive vote value')
        })

        it('submit vote with both upvote value and downvote value should fail', async() => {

            const invalidAttestation = new Attestation(
                BigInt(attesterId),
                BigInt(upvoteValue),
                BigInt(downvoteValue),
                graffiti,
                overwriteGraffiti,
            )

            await expect(contractCalledByAttesters[fromUser].vote(
                attesterSigs[fromUser],
                invalidAttestation, 
                toEpk,
                fromEpk,
                nullifiers, 
                publicSignals, 
                formatProofForVerifierContract(proof),
                { value: attestingFee, gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep Social: should only choose to upvote or to downvote')
        })
    })
})