// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { formatProofForSnarkjsVerification } from "@unirep/circuits"
import { attestingFee, epochLength, numEpochKeyNoncePerEpoch, maxUsers, UserState, circuitGlobalStateTreeDepth, circuitEpochTreeDepth, circuitUserStateTreeDepth, maxAttesters, genUserStateFromContract, genEpochKey } from '@unirep/unirep'
import { deployUnirep, EpochKeyProof, ReputationProof } from '@unirep/contracts'
import { genIdentity, genIdentityCommitment, genRandomSalt } from '@unirep/crypto'

import { findValidNonce, getTreeDepthsForTesting } from './utils'
import { defaultAirdroppedReputation, defaultCommentReputation, defaultPostReputation, maxReputationBudget } from '../config/socialMedia'
import { deployUnirepSocial } from '../core/utils'


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
    let reputationProof: ReputationProof
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

        attesterId = BigInt(await unirepContract.attesters(unirepSocialContract.address))
        expect(attesterId).not.equal(BigInt(0))
        const airdropAmount = await unirepContract.airdropAmount(unirepSocialContract.address)
        expect(airdropAmount).equal(defaultAirdroppedReputation)
    })

    describe('User sign-ups', () => {
        it('sign up should succeed', async () => {            
            for (let i = 0; i < 2; i++) {
                ids[i] = genIdentity()
                commitments[i] = genIdentityCommitment(ids[i])
                const tx = await unirepSocialContract.userSignUp(commitments[i])
                const receipt = await tx.wait()

                expect(receipt.status).equal(1)

                const numUserSignUps_ = await unirepContract.numUserSignUps()
                expect(i+1).equal(numUserSignUps_)

                users[i] = await genUserStateFromContract(
                    hardhatEthers.provider,
                    unirepContract.address,
                    ids[i],
                )
            }
        })
    })

    describe('Generate reputation proof for verification', () => {

        it('reputation proof should be verified valid off-chain and on-chain', async() => {
            const proveGraffiti = BigInt(0)
            const minPosRep = 0, graffitiPreImage = BigInt(0)
            const epkNonce = 0
            const epoch = users[0].getUnirepStateCurrentEpoch()
            const nonceList: BigInt[] = findValidNonce(
                users[0], 
                upvoteValue, 
                epoch, 
                attesterId
            )
            const { publicSignals, proof } = await users[0].genProveReputationProof(
                attesterId, 
                epkNonce, 
                minPosRep, 
                proveGraffiti, 
                graffitiPreImage, 
                nonceList
            )
            reputationProof = new ReputationProof(
                publicSignals,
                proof
            )
            const isValid = await reputationProof.verify()
            expect(isValid, 'Verify reputation proof off-chain failed').to.be.true

            const isProofValid = await unirepContract.verifyReputation(reputationProof)
            expect(isProofValid, "proof is not valid").to.be.true
        })
    })

    describe('Upvote', () => {
        const currentEpoch = 1
        let toEpochKey = genEpochKey(genRandomSalt(), currentEpoch, 0)
        let epochKeyProofIndex
        it('submit epoch key proof should succeed', async() => {
            const proof: string[] = []
            for (let i = 0; i < 8; i++) {
                proof.push('0')
            }
            const publicSignals = [genRandomSalt(), currentEpoch, toEpochKey]
            const epochKeyProof = new EpochKeyProof(
                publicSignals,
                formatProofForSnarkjsVerification(proof)
            )
            const tx = await unirepContract.submitEpochKeyProof(epochKeyProof)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            epochKeyProofIndex = await unirepContract.getProofIndex(epochKeyProof.hash())
        })

        it('submit upvote should succeed', async() => {
            const tx = await unirepSocialContract.vote(
                upvoteValue,
                0,
                toEpochKey,
                epochKeyProofIndex,
                reputationProof,
                { value: attestingFee.mul(2), gasLimit: 1000000 }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit vote failed').to.equal(1)
        })

        it('submit upvote with different amount of nullifiers should fail', async() => {
            const proveGraffiti = BigInt(0)
            const minPosRep = 0, graffitiPreImage = BigInt(0)
            const epkNonce = 0
            const falseRepAmout = upvoteValue + 1
            const epoch = users[0].getUnirepStateCurrentEpoch()
            const nonceList: BigInt[] = findValidNonce(
                users[0], 
                falseRepAmout, 
                epoch, 
                attesterId
            )
            const { publicSignals, proof } = await users[0].genProveReputationProof(
                attesterId, 
                epkNonce, 
                minPosRep, 
                proveGraffiti, 
                graffitiPreImage, 
                nonceList
            )
            reputationProof = new ReputationProof(
                publicSignals,
                proof
            )
            const isValid = await reputationProof.verify()
            expect(isValid, 'Verify reputation proof off-chain failed').to.be.true

            await expect(unirepSocialContract.vote(
                upvoteValue,
                0,
                toEpochKey,
                epochKeyProofIndex,
                reputationProof,
                { value: attestingFee.mul(2), gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep Social: submit different nullifiers amount from the vote value')
        })

        it('submit zero proof index upvote should fail', async() => {
            const proveGraffiti = BigInt(0)
            const minPosRep = 0, graffitiPreImage = BigInt(0)
            const epkNonce = 0
            const epoch = users[0].getUnirepStateCurrentEpoch()
            const nonceList: BigInt[] = findValidNonce(
                users[0], 
                upvoteValue, 
                epoch, 
                attesterId
            )
            const { publicSignals, proof } = await users[0].genProveReputationProof(
                attesterId, 
                epkNonce, 
                minPosRep, 
                proveGraffiti, 
                graffitiPreImage, 
                nonceList
            )
            reputationProof = new ReputationProof(
                publicSignals,
                proof
            )
            const isValid = await reputationProof.verify()
            expect(isValid, 'Verify reputation proof off-chain failed').to.be.true

            const zeroProofIndex = 0
            await expect(unirepSocialContract.vote(
                upvoteValue,
                0,
                toEpochKey,
                zeroProofIndex,
                reputationProof,
                { value: attestingFee.mul(2), gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep: invalid proof index')
        })

        it('submit upvote with both upvote and downvote value should fail', async() => {
            await expect(unirepSocialContract.vote(
                upvoteValue,
                downvoteValue,
                toEpochKey,
                epochKeyProofIndex,
                reputationProof,
                { value: attestingFee.mul(2), gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep Social: should only choose to upvote or to downvote')
        })

        it('submit vote with 0 value should fail', async() => {
            await expect(unirepSocialContract.vote(
                0,
                0,
                toEpochKey,
                epochKeyProofIndex,
                reputationProof,
                { value: attestingFee.mul(2), gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep Social: should submit a positive vote value')
        })
        

        it('submit upvote proof with wrong attester id should fail', async() => {
            const falseAttesterId = attesterId + BigInt(1)
            reputationProof.attesterId = falseAttesterId

            await expect(unirepSocialContract.vote(
                reputationProof.proveReputationAmount,
                0,
                toEpochKey,
                epochKeyProofIndex,
                reputationProof,
                { value: attestingFee.mul(2), gasLimit: 1000000 }
            )).to.be.revertedWith('Unirep Social: submit a proof with different attester ID from Unirep Social')
        })
    })
})