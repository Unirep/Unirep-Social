import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import { expect } from 'chai'
import { verifyProof, formatProofForVerifierContract } from "@unirep/circuits"
import { attestingFee, epochLength, numEpochKeyNoncePerEpoch, maxUsers, UnirepState, UserState, circuitGlobalStateTreeDepth, circuitEpochTreeDepth, circuitUserStateTreeDepth, genNewSMT } from '@unirep/unirep'
import { deployUnirep } from '@unirep/contracts'
import { genIdentity, genIdentityCommitment, genRandomSalt, hash5, hashLeftRight, IncrementalQuinTree } from '@unirep/crypto'

import { genNewUserStateTree, getTreeDepthsForTesting } from '../utils'
import { DEFAULT_AIRDROPPED_KARMA, DEFAULT_COMMENT_KARMA, DEFAULT_POST_KARMA, MAX_KARMA_BUDGET } from '../../config/socialMedia'
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
    let results
    const text = genRandomSalt().toString()
    let attesterId
    const upvoteValue = 3
    const downvoteValue = 5

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
        const numEpochKeyNoncePerEpoch_ = await unirepContract.numEpochKeyNoncePerEpoch()
        expect(numEpochKeyNoncePerEpoch).equal(numEpochKeyNoncePerEpoch_)
        const maxUsers_ = await unirepContract.maxUsers()
        expect(maxUsers).equal(maxUsers_)

        const treeDepths_ = await unirepContract.treeDepths()
        expect(circuitEpochTreeDepth).equal(treeDepths_.epochTreeDepth)
        expect(circuitGlobalStateTreeDepth).equal(treeDepths_.globalStateTreeDepth)
        expect(circuitUserStateTreeDepth).equal(treeDepths_.userStateTreeDepth)

        const postReputation_ = await unirepSocialContract.postReputation()
        expect(postReputation_).equal(DEFAULT_POST_KARMA)
        const commentReputation_ = await unirepSocialContract.commentReputation()
        expect(commentReputation_).equal(DEFAULT_COMMENT_KARMA)
        const airdroppedReputation_ = await unirepSocialContract.airdroppedReputation()
        expect(airdroppedReputation_).equal(DEFAULT_AIRDROPPED_KARMA)
        const unirepAddress_ = await unirepSocialContract.unirep()
        expect(unirepAddress_).equal(unirepContract.address)

        attesterId = await unirepContract.attesters(unirepSocialContract.address)
        expect(attesterId).not.equal(0)
        const airdropAmount = await unirepContract.airdropAmount(unirepSocialContract.address)
        expect(airdropAmount).equal(DEFAULT_AIRDROPPED_KARMA)
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
            let GSTreeLeafIndex: number = -1
            const currentEpoch = await unirepContract.currentEpoch()
            unirepState = new UnirepState(
                circuitGlobalStateTreeDepth,
                circuitUserStateTreeDepth,
                circuitEpochTreeDepth,
                attestingFee,
                epochLength,
                numEpochKeyNoncePerEpoch,
            )
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
                const leafValue = hash5([BigInt(DEFAULT_AIRDROPPED_KARMA), BigInt(0), BigInt(0), BigInt(1)])
                const tree = await genNewSMT(circuitUserStateTreeDepth, defaultLeafHash)
                await tree.update(BigInt(attesterId), leafValue)
                const SMTRoot = await tree.getRootHash()
                const hashedStateLeaf = hashLeftRight(commitments[i], SMTRoot)
                GSTree.insert(hashedStateLeaf)

                unirepState.signUp(currentEpoch.toNumber(), hashedStateLeaf)
                users[i] = new UserState(
                    unirepState,
                    ids[i],
                    commitments[i],
                    false
                )

                const latestTransitionedToEpoch = currentEpoch.toNumber()
                const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
                const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
                let _attesterId, _airdrppedAmount

                for (let j = 0; j < newLeafEvents.length; j++) {
                    if(BigInt(newLeafEvents[j]?.args?._hashedLeaf) == hashedStateLeaf){
                        GSTreeLeafIndex = newLeafEvents[j]?.args?._leafIndex.toNumber()
                        _attesterId = newLeafEvents[j]?.args?._attesterId.toNumber()
                        _airdrppedAmount = newLeafEvents[j]?.args?._airdropAmount.toNumber()
                    }
                }
                expect(GSTreeLeafIndex).to.equal(i)
            
                users[i].signUp(latestTransitionedToEpoch, GSTreeLeafIndex, _attesterId, _airdrppedAmount)
            }
        })
    })

    describe('Generate reputation proof for verification', () => {

        it('reputation proof should be verified valid off-chain and on-chain', async() => {
            const proveGraffiti = 0
            const minPosRep = 0, graffitiPreImage = 0
            const epkNonce = 0
            results = await users[0].genProveReputationProof(BigInt(attesterId), upvoteValue, epkNonce, minPosRep, proveGraffiti, graffitiPreImage)
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

    describe('Upvote', () => {
        const toEpochKey = genRandomSalt()
        it('submit upvote should succeed', async() => {
            const proofsRelated = [
                results.epochKey,
                results.globalStatetreeRoot,
                results.attesterId,
                results.proveReputationAmount,
                results.minRep,
                results.proveGraffiti,
                results.graffitiPreImage,
                formatProofForVerifierContract(results.proof)
            ]

            const tx = await unirepSocialContract.vote(
                upvoteValue,
                0,
                toEpochKey,
                results.reputationNullifiers,
                proofsRelated,
                { value: attestingFee.mul(2), gasLimit: 1000000 }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit vote failed').to.equal(1)

            for (let i = 0; i < MAX_KARMA_BUDGET; i++) {
                const nullifier = BigInt(results.reputationNullifiers[i])
                unirepState.addReputationNullifiers(nullifier)
            }
        })

        it('submit upvote with different amount of nullifiers should fail', async() => {
            const proveGraffiti = 0
            const minPosRep = 0, graffitiPreImage = 0
            const epkNonce = 0
            const falseRepAmout = upvoteValue + 1
            results = await users[0].genProveReputationProof(BigInt(attesterId), falseRepAmout, epkNonce, minPosRep, proveGraffiti, graffitiPreImage)
            const isValid = await verifyProof('proveReputation', results.proof, results.publicSignals)
            expect(isValid, 'Verify reputation proof off-chain failed').to.be.true

            const proofsRelated = [
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
                results.reputationNullifiers,
                proofsRelated,
                { value: attestingFee.mul(2), gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep Social: submit different nullifiers amount from the vote value')
        })

        it('submit upvote with both upvote and downvote value should fail', async() => {
            const proofsRelated = [
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
                downvoteValue,
                toEpochKey,
                results.reputationNullifiers,
                proofsRelated,
                { value: attestingFee.mul(2), gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep Social: should only choose to upvote or to downvote')
        })

        it('submit vote with 0 value should fail', async() => {
            const proofsRelated = [
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
                0,
                0,
                toEpochKey,
                results.reputationNullifiers,
                proofsRelated,
                { value: attestingFee.mul(2), gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep Social: should submit a positive vote value')
        })
        

        it('submit upvote proof with wrong attester id should fail', async() => {
            const falseAttesterId = attesterId + 1
            const proofsRelated = [
                results.epochKey,
                results.globalStatetreeRoot,
                falseAttesterId,
                results.proveReputationAmount,
                results.minRep,
                results.proveGraffiti,
                results.graffitiPreImage,
                formatProofForVerifierContract(results.proof)
            ]

            await expect(unirepSocialContract.vote(
                results.proveReputationAmount,
                0,
                toEpochKey,
                results.reputationNullifiers,
                proofsRelated,
                { value: attestingFee.mul(2), gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep Social: submit a proof with different attester ID from Unirep Social')
        })
    })
})