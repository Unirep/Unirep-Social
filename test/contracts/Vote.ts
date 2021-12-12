import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import { expect } from 'chai'
import { verifyProof, formatProofForVerifierContract, CircuitName } from "@unirep/circuits"
import { attestingFee, epochLength, numEpochKeyNoncePerEpoch, maxUsers, UnirepState, UserState, circuitGlobalStateTreeDepth, circuitEpochTreeDepth, circuitUserStateTreeDepth, genNewSMT, maxAttesters, ISettings } from '@unirep/unirep'
import { deployUnirep } from '@unirep/contracts'
import { genIdentity, genIdentityCommitment, genRandomSalt, hash5, hashLeftRight, IncrementalQuinTree } from '@unirep/crypto'

import { findValidNonce, genNewUserStateTree, getTreeDepthsForTesting } from '../utils'
import { defaultAirdroppedReputation, defaultCommentReputation, defaultPostReputation, maxReputationBudget } from '../../config/socialMedia'
import { deployUnirepSocial } from '../../core/utils'


describe('Vote', function () {
    this.timeout(300000)

    let unirepContract
    let unirepSocialContract
    let GSTree
    let emptyUserStateRoot
    const ids = new Array(2)
    const commitments = new Array(2)
    let users: UserState[] = new Array(2)
    let unirepState
    
    let accounts: ethers.Signer[]
    let reputationProofData
    const text = genRandomSalt().toString()
    let attesterId
    const upvoteValue = 3
    const downvoteValue = 5

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

        const blankGSLeaf = await unirepContract.hashedBlankStateLeaf()
        GSTree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)
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
            let GSTreeLeafIndex: number = 0
            const currentEpoch = await unirepContract.currentEpoch()
            const treeDepths_ = await unirepContract.treeDepths()
            const blankGSLeaf = await unirepContract.hashedBlankStateLeaf()
            const setting: ISettings = {
                globalStateTreeDepth: treeDepths_.globalStateTreeDepth,
                userStateTreeDepth: treeDepths_.userStateTreeDepth,
                epochTreeDepth: treeDepths_.epochTreeDepth,
                attestingFee: attestingFee,
                epochLength: epochLength,
                numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
                maxReputationBudget: maxReputationBudget,
                defaultGSTLeaf: blankGSLeaf
            }
            unirepState = new UnirepState(setting)
            for (let i = 0; i < 2; i++) {
                ids[i] = genIdentity()
                commitments[i] = genIdentityCommitment(ids[i])
                const tx = await unirepSocialContract.userSignUp(commitments[i])
                const receipt = await tx.wait()

                expect(receipt.status).equal(1)

                const numUserSignUps_ = await unirepContract.numUserSignUps()
                expect(i+1).equal(numUserSignUps_)

                // expected airdropped user state
                const defaultLeafHash = hash5([])
                const leafValue = hash5([BigInt(defaultAirdroppedReputation), BigInt(0), BigInt(0), BigInt(1)])
                const tree = await genNewSMT(circuitUserStateTreeDepth, defaultLeafHash)
                await tree.update(BigInt(attesterId), leafValue)
                const SMTRoot = await tree.getRootHash()
                const hashedStateLeaf = hashLeftRight(commitments[i], SMTRoot)
                GSTree.insert(hashedStateLeaf)

                unirepState.signUp(currentEpoch.toNumber(), hashedStateLeaf)
                users[i] = new UserState(
                    unirepState,
                    ids[i],
                    false
                )

                const latestTransitionedToEpoch = currentEpoch.toNumber()
                const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
                const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
                
                expect(newLeafEvents.length).equal(i+1)
                const proofIndex = newLeafEvents[i].args?._proofIndex
                const signUpFilter = unirepContract.filters.UserSignUp(proofIndex)
                const signUpEvents = await unirepContract.queryFilter(signUpFilter)
                expect(signUpEvents.length).equal(1)
                const commitment = BigInt(signUpEvents[0]?.args?._identityCommitment)
                // const newLeaf = BigInt(newLeafEvents[0].args?._hashedLeaf)
                if(commitments[i] == commitment) {
                    const _attesterId = signUpEvents[0]?.args?._attesterId.toNumber()
                    const _airdrppedAmount = signUpEvents[0]?.args?._airdropAmount.toNumber()
                    users[i].signUp(latestTransitionedToEpoch, GSTreeLeafIndex, _attesterId, _airdrppedAmount)
                    GSTreeLeafIndex ++
                }                
            }
        })
    })

    describe('Generate reputation proof for verification', () => {

        it('reputation proof should be verified valid off-chain and on-chain', async() => {
            const proveGraffiti = BigInt(0)
            const minPosRep = BigInt(0), graffitiPreImage = BigInt(0)
            const epkNonce = 0
            const epoch = users[0].getUnirepStateCurrentEpoch()
            const nonceList: BigInt[] = findValidNonce(users[0], upvoteValue, epoch, BigInt(attesterId))
            const results = await users[0].genProveReputationProof(BigInt(attesterId), epkNonce, minPosRep, proveGraffiti, graffitiPreImage, nonceList)
            const isValid = await verifyProof(CircuitName.proveReputation, results.proof, results.publicSignals)
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

            reputationProofData = [
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
            expect(isProofValid, "proof is not valid").to.be.true
        })
    })

    describe('Upvote', () => {
        let toEpochKey = genRandomSalt()
        const currentEpoch = 1
        let epochKeyProofIndex
        it('submit epoch key proof should succeed', async() => {
            const proof: BigInt[] = []
            for (let i = 0; i < 8; i++) {
                proof.push(BigInt(0))
            }
            let epochKeyProof = [genRandomSalt(), currentEpoch, toEpochKey, proof]
            const tx = await unirepContract.submitEpochKeyProof(epochKeyProof)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
            const proofNullifier = await unirepContract.hashEpochKeyProof(epochKeyProof)
            epochKeyProofIndex = await unirepContract.getProofIndex(proofNullifier)
        })

        it('submit upvote should succeed', async() => {
            const tx = await unirepSocialContract.vote(
                upvoteValue,
                0,
                toEpochKey,
                epochKeyProofIndex,
                reputationProofData,
                { value: attestingFee.mul(2), gasLimit: 1000000 }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit vote failed').to.equal(1)

            for (let i = 0; i < maxReputationBudget; i++) {
                const nullifier = BigInt(reputationProofData[0][i])
                unirepState.addReputationNullifiers(nullifier)
            }
        })

        it('submit upvote with different amount of nullifiers should fail', async() => {
            const proveGraffiti = BigInt(0)
            const minPosRep = BigInt(0), graffitiPreImage = BigInt(0)
            const epkNonce = 0
            const falseRepAmout = upvoteValue + 1
            const epoch = users[0].getUnirepStateCurrentEpoch()
            const nonceList: BigInt[] = findValidNonce(users[0], falseRepAmout, epoch, BigInt(attesterId))
            const results = await users[0].genProveReputationProof(BigInt(attesterId), epkNonce, minPosRep, proveGraffiti, graffitiPreImage, nonceList)
            const isValid = await verifyProof(CircuitName.proveReputation, results.proof, results.publicSignals)
            expect(isValid, 'Verify reputation proof off-chain failed').to.be.true

            reputationProofData = [
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

            await expect(unirepSocialContract.vote(
                upvoteValue,
                0,
                toEpochKey,
                epochKeyProofIndex,
                reputationProofData,
                { value: attestingFee.mul(2), gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep Social: submit different nullifiers amount from the vote value')
        })

        it('submit zero proof index upvote should fail', async() => {
            const proveGraffiti = BigInt(0)
            const minPosRep = BigInt(0), graffitiPreImage = BigInt(0)
            const epkNonce = 0
            const epoch = users[0].getUnirepStateCurrentEpoch()
            const nonceList: BigInt[] = findValidNonce(users[0], upvoteValue, epoch, BigInt(attesterId))
            const results = await users[0].genProveReputationProof(BigInt(attesterId), epkNonce, minPosRep, proveGraffiti, graffitiPreImage, nonceList)
            const isValid = await verifyProof(CircuitName.proveReputation, results.proof, results.publicSignals)
            expect(isValid, 'Verify reputation proof off-chain failed').to.be.true

            reputationProofData = [
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
            const zeroProofIndex = 0
            await expect(unirepSocialContract.vote(
                upvoteValue,
                0,
                toEpochKey,
                zeroProofIndex,
                reputationProofData,
                { value: attestingFee.mul(2), gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep: invalid proof index')
        })

        it('submit upvote with both upvote and downvote value should fail', async() => {
            await expect(unirepSocialContract.vote(
                upvoteValue,
                downvoteValue,
                toEpochKey,
                epochKeyProofIndex,
                reputationProofData,
                { value: attestingFee.mul(2), gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep Social: should only choose to upvote or to downvote')
        })

        it('submit vote with 0 value should fail', async() => {
            await expect(unirepSocialContract.vote(
                0,
                0,
                toEpochKey,
                epochKeyProofIndex,
                reputationProofData,
                { value: attestingFee.mul(2), gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep Social: should submit a positive vote value')
        })
        

        it('submit upvote proof with wrong attester id should fail', async() => {
            const falseAttesterId = attesterId + 1
            reputationProofData[4] = falseAttesterId

            await expect(unirepSocialContract.vote(
                reputationProofData[5],
                0,
                toEpochKey,
                epochKeyProofIndex,
                reputationProofData,
                { value: attestingFee.mul(2), gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep Social: submit a proof with different attester ID from Unirep Social')
        })
    })
})