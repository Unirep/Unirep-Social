import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt, genIdentity, genIdentityCommitment, } from '@unirep/crypto'
import { CircuitName, formatProofForVerifierContract, verifyProof } from '@unirep/circuits'
import { deployUnirep } from '@unirep/contracts'
import { attestingFee, epochLength, numEpochKeyNoncePerEpoch, maxReputationBudget, UserState, genUserStateFromContract, maxUsers, maxAttesters, genUserStateFromParams } from '@unirep/unirep'

import { findValidNonce, genEpochKey, getTreeDepthsForTesting } from '../utils'
import { defaultAirdroppedReputation, defaultCommentReputation, defaultPostReputation } from '../../config/socialMedia'
import { deployUnirepSocial } from '../../core/utils'
describe('Generate user state', function () {
    this.timeout(500000)

    let users: UserState[] = new Array(2)
    const firstUser = 0
    let userIds: any[] = []
    let userCommitments: BigInt[] = []
    let savedUserState: any

    let unirepContract: ethers.Contract
    let unirepSocialContract: ethers.Contract
    let _treeDepths
    let unirepSocialId

    let currentEpoch: ethers.BigNumber
    let reputationProofIndex

    let accounts: ethers.Signer[]


    let postId = '123456'
    let commentId = '654321'
    let postText = 'postText'
    let commentText = 'commentText'

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        _treeDepths = getTreeDepthsForTesting("circuit")
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
        unirepSocialId = (await unirepContract.attesters(unirepSocialContract.address)).toNumber()

        currentEpoch = await unirepContract.currentEpoch()
    })

    describe('User Sign Up event', () => {
        it('users sign up events', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)
            userIds.push(id)
            userCommitments.push(commitment)

            const initUserState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )

            const tx = await unirepSocialContract.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)

            const latestTransitionedToEpoch = currentEpoch.toNumber()
            const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
            
            expect(newLeafEvents.length).equal(1)
            const proofIndex = newLeafEvents[0].args?._proofIndex
            const signUpFilter = unirepContract.filters.UserSignUp(proofIndex)
            const signUpEvents = await unirepContract.queryFilter(signUpFilter)
            expect(signUpEvents.length).equal(1)
            const _commitment = BigInt(signUpEvents[0]?.args?._identityCommitment)
            expect(_commitment).equal(userCommitments[firstUser])

            let startTime = new Date().getTime()
            users[firstUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )
            let endTime = new Date().getTime()
            console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)

            startTime = new Date().getTime()
            const restoredUserState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                JSON.parse(initUserState.toJSON())
            )
            endTime = new Date().getTime()
            console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            expect(restoredUserState.toJSON()).equal(users[firstUser].toJSON())
            
            expect(users[firstUser].latestTransitionedEpoch).equal(latestTransitionedToEpoch)
            console.log(`First user signs up with commitment (${commitment}), in epoch ${users[firstUser].latestTransitionedEpoch} and GST leaf ${users[firstUser].latestGSTLeafIndex}`)
            console.log('----------------------User State----------------------')
            console.log(users[firstUser].toJSON(4))
            console.log('------------------------------------------------------')
            savedUserState = users[firstUser].toJSON(4)
        })
    })

    describe('Attestation submitted event', () => {
        it('post events', async () => {
            const repNullifiersAmount = defaultPostReputation
            const epkNonce = 0
            const minRep = BigInt(defaultAirdroppedReputation)
            const proveGraffiti = BigInt(0)
            const graffitiPreImage = genRandomSalt()
            users[firstUser] = genUserStateFromParams(
                userIds[firstUser],
                JSON.parse(savedUserState),
            )
            const nonceList: BigInt[] = findValidNonce(users[firstUser], repNullifiersAmount, currentEpoch.toNumber(), BigInt(unirepSocialId))

            const results = await users[firstUser].genProveReputationProof(BigInt(unirepSocialId), epkNonce, minRep, proveGraffiti, graffitiPreImage, nonceList)
            const isValid = await verifyProof(CircuitName.proveReputation, results.proof, results.publicSignals)
            expect(isValid, 'Verify reputation proof off-chain failed').to.be.true
            
            // Verify on-chain
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
                formatProofForVerifierContract(results.proof),
            )
            expect(isProofValid, 'Verify reputation on-chain failed').to.be.true
            
            const proofsRelated = [
                results.reputationNullifiers,
                results.epoch,
                results.epochKey,
                results.globalStatetreeRoot,
                results.attesterId,
                results.proveReputationAmount,
                results.minRep,
                results.proveGraffiti,
                results.graffitiPreImage,
                formatProofForVerifierContract(results.proof),
            ]

            const tx = await unirepSocialContract.publishPost(
                postId, 
                postText, 
                proofsRelated,
                { value: attestingFee, gasLimit: 1000000 }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit post failed').to.equal(1)
        })

        it('restored user state should match the user state after post event', async () => {
            let startTime = new Date().getTime()
            users[firstUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )
            let endTime = new Date().getTime()
            console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)

            startTime = new Date().getTime()
            const restoredUserState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                JSON.parse(savedUserState)
            )
            endTime = new Date().getTime()
            console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            expect(restoredUserState.toJSON()).equal(users[firstUser].toJSON())

            startTime = new Date().getTime()
            const restoredUserStateFromParams = genUserStateFromParams(
                userIds[firstUser],
                JSON.parse(restoredUserState.toJSON()),
            )
            expect(restoredUserStateFromParams.toJSON()).equal(users[firstUser].toJSON())
            endTime = new Date().getTime()
            console.log(`Gen user state purely from a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            
            const unirepEpoch = await unirepContract.currentEpoch()
            const currentEpoch = users[firstUser].getUnirepStateCurrentEpoch()
            expect(currentEpoch).equal(unirepEpoch)
            console.log(`successfully update user state`)
            console.log('----------------------User State----------------------')
            console.log(users[firstUser].toJSON(4))
            console.log('------------------------------------------------------')
            savedUserState = users[firstUser].toJSON(4)
        })

        it('comment events', async () => {
            const repNullifiersAmount = defaultCommentReputation
            const epkNonce = 0
            const minRep = BigInt(defaultAirdroppedReputation)
            const proveGraffiti = BigInt(0)
            const graffitiPreImage = genRandomSalt()
            users[firstUser] = genUserStateFromParams(
                userIds[firstUser],
                JSON.parse(savedUserState),
            )
            const nonceList: BigInt[] = findValidNonce(users[firstUser], repNullifiersAmount, currentEpoch.toNumber(), BigInt(unirepSocialId))

            const results = await users[firstUser].genProveReputationProof(BigInt(unirepSocialId), epkNonce, minRep, proveGraffiti, graffitiPreImage, nonceList)
            const isValid = await verifyProof(CircuitName.proveReputation, results.proof, results.publicSignals)
            expect(isValid, 'Verify reputation proof off-chain failed').to.be.true
            
            // Verify on-chain
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
                formatProofForVerifierContract(results.proof),
            )
            expect(isProofValid, 'Verify reputation on-chain failed').to.be.true
            
            const proofsRelated = [
                results.reputationNullifiers,
                results.epoch,
                results.epochKey,
                results.globalStatetreeRoot,
                results.attesterId,
                results.proveReputationAmount,
                results.minRep,
                results.proveGraffiti,
                results.graffitiPreImage,
                formatProofForVerifierContract(results.proof),
            ]

            const tx = await unirepSocialContract.leaveComment(
                postId, 
                commentId,
                commentText, 
                proofsRelated,
                { value: attestingFee, gasLimit: 1000000 }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit comment failed').to.equal(1)

            // store reputation proof index
            const proofNullifier = await unirepContract.hashReputationProof(proofsRelated)
            reputationProofIndex = await unirepContract.getProofIndex(proofNullifier)
            console.log(reputationProofIndex)
        })

        it('restored user state should match the user state after comment event', async () => {
            let startTime = new Date().getTime()
            users[firstUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )
            let endTime = new Date().getTime()
            console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)

            startTime = new Date().getTime()
            const restoredUserState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                JSON.parse(savedUserState)
            )
            endTime = new Date().getTime()
            console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            expect(restoredUserState.toJSON()).equal(users[firstUser].toJSON())

            startTime = new Date().getTime()
            const restoredUserStateFromParams = genUserStateFromParams(
                userIds[firstUser],
                JSON.parse(restoredUserState.toJSON()),
            )
            expect(restoredUserStateFromParams.toJSON()).equal(users[firstUser].toJSON())
            endTime = new Date().getTime()
            console.log(`Gen user state purely from a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            
            const unirepEpoch = await unirepContract.currentEpoch()
            const currentEpoch = users[firstUser].getUnirepStateCurrentEpoch()
            expect(currentEpoch).equal(unirepEpoch)
            console.log(`successfully update user state`)
            console.log('----------------------User State----------------------')
            console.log(users[firstUser].toJSON(4))
            console.log('------------------------------------------------------')
            savedUserState = users[firstUser].toJSON(4)
        })

        it('vote events', async () => {
            // gen nullifier nonce list
            const upvoteValue = 3
            const repNullifiersAmount = upvoteValue
            const epkNonce = 2

            const toEpkNonce = 0
            const firstUserEpochKey = genEpochKey(users[firstUser].id.identityNullifier, currentEpoch.toNumber(), toEpkNonce)
            const minRep = BigInt(defaultAirdroppedReputation)
            const proveGraffiti = BigInt(0)
            const graffitiPreImage = genRandomSalt()
            users[firstUser] = genUserStateFromParams(
                userIds[firstUser],
                JSON.parse(savedUserState),
            )
            const nonceList: BigInt[] = findValidNonce(users[firstUser], repNullifiersAmount, currentEpoch.toNumber(), BigInt(unirepSocialId))

            const results = await users[firstUser].genProveReputationProof(BigInt(unirepSocialId), epkNonce, minRep, proveGraffiti, graffitiPreImage, nonceList)
            const isValid = await verifyProof(CircuitName.proveReputation, results.proof, results.publicSignals)
            expect(isValid, 'Verify reputation proof off-chain failed').to.be.true
            
            // Verify on-chain
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
                formatProofForVerifierContract(results.proof),
            )
            expect(isProofValid, 'Verify reputation on-chain failed').to.be.true
            
            const proofsRelated = [
                results.reputationNullifiers,
                results.epoch,
                results.epochKey,
                results.globalStatetreeRoot,
                results.attesterId,
                results.proveReputationAmount,
                results.minRep,
                results.proveGraffiti,
                results.graffitiPreImage,
                formatProofForVerifierContract(results.proof),
            ]

            const tx = await unirepSocialContract.vote(
                upvoteValue,
                0,
                firstUserEpochKey,
                reputationProofIndex,
                proofsRelated,
                { value: attestingFee.mul(2), gasLimit: 1000000 }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit vote failed').to.equal(1)
        })

        it('restored user state should match the user state after vote event', async () => {
            let startTime = new Date().getTime()
            users[firstUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )
            let endTime = new Date().getTime()
            console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)

            startTime = new Date().getTime()
            const restoredUserState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                JSON.parse(savedUserState)
            )
            endTime = new Date().getTime()
            console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            expect(restoredUserState.toJSON()).equal(users[firstUser].toJSON())

            startTime = new Date().getTime()
            const restoredUserStateFromParams = genUserStateFromParams(
                userIds[firstUser],
                JSON.parse(restoredUserState.toJSON()),
            )
            expect(restoredUserStateFromParams.toJSON()).equal(users[firstUser].toJSON())
            endTime = new Date().getTime()
            console.log(`Gen user state purely from a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            
            const unirepEpoch = await unirepContract.currentEpoch()
            const currentEpoch = users[firstUser].getUnirepStateCurrentEpoch()
            expect(currentEpoch).equal(unirepEpoch)
            console.log(`successfully update user state`)
            console.log('----------------------User State----------------------')
            console.log(users[firstUser].toJSON(4))
            console.log('------------------------------------------------------')
            savedUserState = users[firstUser].toJSON(4)
        })

        it('airdrop events', async () => {
            users[firstUser] = genUserStateFromParams(
                userIds[firstUser],
                JSON.parse(savedUserState),
            )
            const proofResults = await users[firstUser].genUserSignUpProof(BigInt(unirepSocialId))
            const signUpProof = proofResults.publicSignals.concat([formatProofForVerifierContract(proofResults.proof)])

            // submit epoch key
            let tx = await unirepSocialContract.airdrop(signUpProof, {value: attestingFee})
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
        })

        it('restored user state should match the user state after airdrop event', async () => {
            let startTime = new Date().getTime()
            users[firstUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )
            let endTime = new Date().getTime()
            console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)

            startTime = new Date().getTime()
            const restoredUserState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                JSON.parse(savedUserState)
            )
            endTime = new Date().getTime()
            console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            expect(restoredUserState.toJSON()).equal(users[firstUser].toJSON())

            startTime = new Date().getTime()
            const restoredUserStateFromParams = genUserStateFromParams(
                userIds[firstUser],
                JSON.parse(restoredUserState.toJSON()),
            )
            expect(restoredUserStateFromParams.toJSON()).equal(users[firstUser].toJSON())
            endTime = new Date().getTime()
            console.log(`Gen user state purely from a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            
            const unirepEpoch = await unirepContract.currentEpoch()
            const currentEpoch = users[firstUser].getUnirepStateCurrentEpoch()
            expect(currentEpoch).equal(unirepEpoch)
            console.log(`successfully update user state`)
            console.log('----------------------User State----------------------')
            console.log(users[firstUser].toJSON(4))
            console.log('------------------------------------------------------')
            savedUserState = users[firstUser].toJSON(4)
        })
    })

    describe('Epoch transition event', () => {

        it('epoch transition', async () => {
            // Fast-forward epochLength of seconds
            await hardhatEthers.provider.send("evm_increaseTime", [epochLength])
            // Begin epoch transition
            const tx = await unirepContract.beginEpochTransition()
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        })

        it('restored user state should match the user state after epoch transition', async () => {
            let startTime = new Date().getTime()
            users[firstUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )
            let endTime = new Date().getTime()
            console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)

            startTime = new Date().getTime()
            const restoredUserState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                JSON.parse(savedUserState)
            )
            endTime = new Date().getTime()
            console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            const epoch = 1
            const epochTreeRoot = await users[firstUser].getUnirepStateEpochTree(epoch)
            const restoredEpochTreeRoot = await restoredUserState.getUnirepStateEpochTree(epoch)
            expect(restoredEpochTreeRoot.toString()).equal(epochTreeRoot.toString())

            startTime = new Date().getTime()
            const restoredUserStateFromParams = genUserStateFromParams(
                userIds[firstUser],
                JSON.parse(restoredUserState.toJSON()),
            )
            const restoredEpochTreeRootFromParams = await restoredUserStateFromParams.getUnirepStateEpochTree(epoch)
            expect(restoredEpochTreeRootFromParams.toString()).equal(epochTreeRoot.toString())
            endTime = new Date().getTime()
            console.log(`Gen user state purely from a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            
            const unirepEpoch = await unirepContract.currentEpoch()
            const currentEpoch = users[firstUser].getUnirepStateCurrentEpoch()
            expect(currentEpoch).equal(unirepEpoch)
            console.log(`successfully update user state`)
            console.log('----------------------User State----------------------')
            console.log(users[firstUser].toJSON(4))
            console.log('------------------------------------------------------')
            savedUserState = users[firstUser].toJSON(4)
        })

        it('user state transition', async () => {
            const proofIndexes: ethers.BigNumber[] = []
            const userState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )
            const results = await userState.genUserStateTransitionProofs()
            let isValid = await verifyProof(CircuitName.startTransition, results.startTransitionProof.proof, results.startTransitionProof.publicSignals)
            expect(isValid, 'Verify start transition circuit off-chain failed').to.be.true

            const blindedUserState = results.startTransitionProof.blindedUserState
            const blindedHashChain = results.startTransitionProof.blindedHashChain
            const globalStateTree = results.startTransitionProof.globalStateTreeRoot
            const proof = formatProofForVerifierContract(results.startTransitionProof.proof)
            let tx = await unirepContract.startUserStateTransition(
                blindedUserState,
                blindedHashChain,
                globalStateTree,
                proof,
            )
            let receipt = await tx.wait()
            expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
            console.log("Gas cost of submit a start transition proof:", receipt.gasUsed.toString())

            let proofNullifier = await unirepContract.hashStartTransitionProof(
                blindedUserState,
                blindedHashChain,
                globalStateTree,
                proof
            )
            let proofIndex = await unirepContract.getProofIndex(proofNullifier)
            proofIndexes.push(proofIndex)

            for (let i = 0; i < results.processAttestationProofs.length; i++) {
                isValid = await verifyProof(CircuitName.processAttestations, results.processAttestationProofs[i].proof, results.processAttestationProofs[i].publicSignals)
                expect(isValid, 'Verify process attestations circuit off-chain failed').to.be.true

                const outputBlindedUserState = results.processAttestationProofs[i].outputBlindedUserState
                const outputBlindedHashChain = results.processAttestationProofs[i].outputBlindedHashChain
                const inputBlindedUserState = results.processAttestationProofs[i].inputBlindedUserState

                // submit random process attestations should success and not affect the results
                const falseInput = genRandomSalt()
                tx = await unirepContract.processAttestations(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    falseInput,
                    formatProofForVerifierContract(results.processAttestationProofs[i].proof),
                )
                receipt = await tx.wait()
                expect(receipt.status, 'Submit process attestations proof failed').to.equal(1)

                tx = await unirepContract.processAttestations(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(results.processAttestationProofs[i].proof),
                )
                receipt = await tx.wait()
                expect(receipt.status, 'Submit process attestations proof failed').to.equal(1)
                console.log("Gas cost of submit a process attestations proof:", receipt.gasUsed.toString())

                const proofNullifier = await unirepContract.hashProcessAttestationsProof(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(results.processAttestationProofs[i].proof),
                )
                const proofIndex = await unirepContract.getProofIndex(proofNullifier)
                proofIndexes.push(proofIndex)
            }

            isValid = await verifyProof(CircuitName.userStateTransition, results.finalTransitionProof.proof, results.finalTransitionProof.publicSignals)
            expect(isValid, 'Verify user state transition circuit off-chain failed').to.be.true
            const newGSTLeaf = results.finalTransitionProof.newGlobalStateTreeLeaf

            const fromEpoch = results.finalTransitionProof.transitionedFromEpoch
            const outputEpkNullifiers = results.finalTransitionProof.epochKeyNullifiers
            const blindedUserStates = results.finalTransitionProof.blindedUserStates
            const blindedHashChains = results.finalTransitionProof.blindedHashChains
            const epochTreeRoot = results.finalTransitionProof.fromEpochTree

            const transitionProof = [
                newGSTLeaf,
                outputEpkNullifiers,
                fromEpoch,
                blindedUserStates,
                globalStateTree,
                blindedHashChains,
                epochTreeRoot,
                formatProofForVerifierContract(results.finalTransitionProof.proof),
            ]

            tx = await unirepContract.updateUserStateRoot(
                transitionProof, 
                proofIndexes,
            )
            receipt = await tx.wait()
            expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
            console.log("Gas cost of submit a user state transition proof:", receipt.gasUsed.toString())
        })

        it('restored user state should match the user state after user state transition', async () => {
            let startTime = new Date().getTime()
            users[firstUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )
            let endTime = new Date().getTime()
            console.log(`Gen user state from contract time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            

            startTime = new Date().getTime()
            const restoredUserState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
                JSON.parse(savedUserState)
            )
            endTime = new Date().getTime()
            console.log(`Gen user state from contract with a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            const epoch = 1
            const epochTreeRoot = await users[firstUser].getUnirepStateEpochTree(epoch)
            const restoredEpochTreeRoot = await restoredUserState.getUnirepStateEpochTree(epoch)
            expect(restoredEpochTreeRoot.toString()).equal(epochTreeRoot.toString())

            startTime = new Date().getTime()
            const restoredUserStateFromParams = genUserStateFromParams(
                userIds[firstUser],
                JSON.parse(restoredUserState.toJSON()),
            )
            const restoredEpochTreeRootFromParams = await restoredUserStateFromParams.getUnirepStateEpochTree(epoch)
            expect(restoredEpochTreeRootFromParams.toString()).equal(epochTreeRoot.toString())
            endTime = new Date().getTime()
            console.log(`Gen user state purely from a restored state time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            
            const unirepEpoch = await unirepContract.currentEpoch()
            const currentEpoch = users[firstUser].getUnirepStateCurrentEpoch()
            expect(currentEpoch).equal(unirepEpoch)
            console.log(`successfully update user state`)
            console.log('----------------------User State----------------------')
            console.log(users[firstUser].toJSON(4))
            console.log('------------------------------------------------------')
            savedUserState = users[firstUser].toJSON(4)
        })
    })
})