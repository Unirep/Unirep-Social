import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt, genIdentity, genIdentityCommitment, IncrementalQuinTree, hashLeftRight, } from '@unirep/crypto'
import { CircuitName, formatProofForVerifierContract, verifyProof } from '@unirep/circuits'
import { deployUnirep } from '@unirep/contracts'
import { attestingFee, circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitUserStateTreeDepth, epochLength, numEpochKeyNoncePerEpoch, maxReputationBudget, UnirepState, UserState, IUserStateLeaf, computeEmptyUserStateRoot, IAttestation, genUserStateFromContract, genUnirepStateFromContract, ISettings, maxUsers, maxAttesters } from '@unirep/unirep'

import { findValidNonce, genEpochKey, getTreeDepthsForTesting } from '../utils'
import { defaultAirdroppedReputation, defaultCommentReputation, defaultPostReputation } from '../../config/socialMedia'
import { deployUnirepSocial } from '../../core/utils'
describe('Integration', function () {
    this.timeout(500000)

    let unirepState: UnirepState
    let users: UserState[] = new Array(2)
    const firstUser = 0
    const secondUser = 1
    let userIds: any[] = []
    let userCommitments: BigInt[] = []

    // Data that are needed for verifying proof
    let userStateLeavesAfterTransition: IUserStateLeaf[][] = new Array(2)

    let unirepContract: ethers.Contract
    let unirepSocialContract: ethers.Contract
    let _treeDepths
    let unirepSocialId

    let currentEpoch: ethers.BigNumber
    let emptyUserStateRoot: BigInt
    let blankGSLeaf: BigInt
    let userStateTransitionedNum: {[key: number]: ethers.BigNumber[]} = {}
    let epochKeys: {[key: string]: boolean} = {}
    let reputationProofIndex

    let accounts: ethers.Signer[]

    let duplicatedProofInputs

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
        emptyUserStateRoot = computeEmptyUserStateRoot(circuitUserStateTreeDepth)
        blankGSLeaf = hashLeftRight(BigInt(0), emptyUserStateRoot)

        const setting: ISettings = {
            globalStateTreeDepth: _treeDepths.globalStateTreeDepth,
            userStateTreeDepth: _treeDepths.userStateTreeDepth,
            epochTreeDepth: _treeDepths.epochTreeDepth,
            attestingFee: attestingFee,
            epochLength: epochLength,
            numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
            maxReputationBudget: maxReputationBudget,
            defaultGSTLeaf: blankGSLeaf
        }
        unirepState = new UnirepState(setting)
    })

    describe('First epoch', () => {
        it('First user signs up', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)
            userIds.push(id)
            userCommitments.push(commitment)

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
        
            users[firstUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )
            
            expect(users[firstUser].latestTransitionedEpoch).equal(latestTransitionedToEpoch)
            console.log(`First user signs up with commitment (${commitment}), in epoch ${users[firstUser].latestTransitionedEpoch} and GST leaf ${users[firstUser].latestGSTLeafIndex}`)
            console.log('----------------------User State----------------------')
            console.log(users[firstUser].toJSON(4))
            console.log('------------------------------------------------------')
        })

        it('Global state tree built from events should match', async () => {
            unirepState = await genUnirepStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
            )
            
            const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
            const newLeaves: BigInt[] = []

            for(const event of newLeafEvents){
                newLeaves.push(BigInt(event?.args?._hashedLeaf))
            }

            let observedGST = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)
            for(let leaf of newLeaves) {
                observedGST.insert(leaf)
            }
            expect(observedGST.root, 'GST root mismatch').to.equal(unirepState.genGSTree(currentEpoch.toNumber()).root)
        })
    })

    // No attestations made during first epoch
    // First user transitioned from epoch with no attestations

    describe('Second epoch', () => {
        const secondEpochEpochKeys: string[] = []
        let attestationsFromUnirepSocial: number = 0
        it('begin first epoch epoch transition', async () => {
            // Fast-forward epochLength of seconds
            await hardhatEthers.provider.send("evm_increaseTime", [epochLength])
            // Begin epoch transition
            let tx = await unirepContract.beginEpochTransition()
            let receipt = await tx.wait()
            expect(receipt.status, 'Epoch transition failed').to.equal(1)
            console.log(`Gas cost of epoch transition): ${receipt.gasUsed.toString()}`)

            currentEpoch = await unirepContract.currentEpoch()
            expect(currentEpoch, 'Current epoch should be 2').to.equal(2)

            unirepState = await genUnirepStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
            )
            console.log('----------------------Unirep State----------------------')
            console.log(unirepState.toJSON(4))
            console.log('------------------------------------------------------')

            userStateTransitionedNum[currentEpoch.toNumber()] = []
        })

        it('First user transition from first epoch', async () => {
            const fromEpoch = users[firstUser].latestTransitionedEpoch
            const fromEpochGSTree: IncrementalQuinTree = unirepState.genGSTree(fromEpoch)
            const GSTreeRoot = fromEpochGSTree.root
            const fromEpochTree = await unirepState.genEpochTree(fromEpoch)
            const epochTreeRoot = fromEpochTree.getRootHash()
            const epkNullifiers = users[firstUser].getEpochKeyNullifiers(fromEpoch)
            const proofIndexes: BigInt[] = []
            console.log('Processing first user\'s transition: ')
            console.log(`from epoch ${fromEpoch}, GSTreeRoot ${GSTreeRoot}, epochTreeRoot ${epochTreeRoot}`)
            console.log(`and epkNullifiers [${epkNullifiers}]`)

            users[firstUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )
            const results = await users[firstUser].genUserStateTransitionProofs()
            let isValid = await verifyProof(CircuitName.startTransition, results.startTransitionProof.proof, results.startTransitionProof.publicSignals)
            expect(isValid, 'Verify start transition circuit off-chain failed').to.be.true

            const blindedUserState = results.startTransitionProof.blindedUserState
            const blindedHashChain = results.startTransitionProof.blindedHashChain
            const globalStateTree = results.startTransitionProof.globalStateTreeRoot
            const proof = formatProofForVerifierContract(results.startTransitionProof.proof)
            let tx = await unirepSocialContract.startUserStateTransition(
                blindedUserState,
                blindedHashChain,
                globalStateTree,
                proof,
            )
            let receipt = await tx.wait()
            expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)

            let proofNullifier = await unirepContract.hashStartTransitionProof(
                blindedUserState,
                blindedHashChain,
                GSTreeRoot,
                proof
            )
            let proofIndex = await unirepContract.getProofIndex(proofNullifier)
            proofIndexes.push(BigInt(proofIndex))

            for (let i = 0; i < results.processAttestationProofs.length; i++) {
                isValid = await verifyProof(CircuitName.processAttestations, results.processAttestationProofs[i].proof, results.processAttestationProofs[i].publicSignals)
                expect(isValid, 'Verify process attestations circuit off-chain failed').to.be.true

                const outputBlindedUserState = results.processAttestationProofs[i].outputBlindedUserState
                const outputBlindedHashChain = results.processAttestationProofs[i].outputBlindedHashChain
                const inputBlindedUserState = results.processAttestationProofs[i].inputBlindedUserState

                tx = await unirepSocialContract.processAttestations(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(results.processAttestationProofs[i].proof),
                )
                receipt = await tx.wait()
                expect(receipt.status, 'Submit process attestations proof failed').to.equal(1)
                
                const proofNullifier = await unirepContract.hashProcessAttestationsProof(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(results.processAttestationProofs[i].proof),
                )
                const proofIndex = await unirepContract.getProofIndex(proofNullifier)
                proofIndexes.push(BigInt(proofIndex))
            }

            isValid = await verifyProof(CircuitName.userStateTransition, results.finalTransitionProof.proof, results.finalTransitionProof.publicSignals)
            expect(isValid, 'Verify user state transition circuit off-chain failed').to.be.true
            const newGSTLeaf = results.finalTransitionProof.newGlobalStateTreeLeaf

            const outputEpkNullifiers = results.finalTransitionProof.epochKeyNullifiers
            const blindedUserStates = results.finalTransitionProof.blindedUserStates
            const blindedHashChains = results.finalTransitionProof.blindedHashChains

            // Verify nullifiers outputted by circuit are the same as the ones computed off-chain
            const outputEPKNullifiers: BigInt[] = []
            for (let i = 0; i < epkNullifiers.length; i++) {
                const outputNullifier = results.finalTransitionProof.epochKeyNullifiers[i]
                expect(BigNumber.from(epkNullifiers[i])).to.equal(BigNumber.from(outputNullifier))
                outputEPKNullifiers.push(outputNullifier)
            }
            // Verify new state state outputted by circuit is the same as the one computed off-chain
            const newState = await users[firstUser].genNewUserStateAfterTransition()
            expect(newGSTLeaf, 'Computed new GST leaf should match').to.equal(newState.newGSTLeaf.toString())
            userStateLeavesAfterTransition[firstUser] = newState.newUSTLeaves
            userStateTransitionedNum[currentEpoch.toNumber()].push(newGSTLeaf)

            const transitionProof = [
                newGSTLeaf,
                outputEpkNullifiers,
                fromEpoch,
                blindedUserStates,
                GSTreeRoot,
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
        })

        it('genUserStateFromContract should match', async () => {
            const userStateFromContract = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                users[firstUser].id,
            )
            console.log('----------------------User State----------------------')
            console.log(userStateFromContract.toJSON(4))
            console.log('------------------------------------------------------')

            expect(userStateFromContract.latestTransitionedEpoch).equal(currentEpoch)
            expect(userStateFromContract.latestGSTLeafIndex).not.equal(-1)
        })

        it('Second user signs up', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)
            userIds.push(id)
            userCommitments.push(commitment)

            const tx = await unirepSocialContract.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)

            const latestTransitionedToEpoch = currentEpoch.toNumber()
            const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
            
            expect(newLeafEvents.length).equal(2)
            const proofIndex = newLeafEvents[1].args?._proofIndex
            const signUpFilter = unirepContract.filters.UserSignUp(proofIndex)
            const signUpEvents = await unirepContract.queryFilter(signUpFilter)
            expect(signUpEvents.length).equal(1)
            const _commitment = BigInt(signUpEvents[0]?.args?._identityCommitment)
            expect(_commitment).equal(commitment)

            users[secondUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[secondUser],
            )
            
            expect(users[secondUser].latestTransitionedEpoch).equal(latestTransitionedToEpoch)
            console.log(`Second user signs up with commitment (${commitment}), in epoch ${users[secondUser].latestTransitionedEpoch} and GST leaf ${users[secondUser].latestGSTLeafIndex}`)
            console.log('----------------------User State----------------------')
            console.log(users[secondUser].toJSON(4))
            console.log('------------------------------------------------------')
        })

        it('first user generate an epoch key and verify it', async () => {
            const epochKeyNonce = 0
            const results = await users[firstUser].genVerifyEpochKeyProof(epochKeyNonce)
            const isValid = await verifyProof(CircuitName.verifyEpochKey, results.proof, results.publicSignals)
            expect(isValid, 'Verify epk proof off-chain failed').to.be.true
            
            // Verify on-chain
            const GSTree = unirepState.genGSTree(currentEpoch.toNumber())
            const firstUserEpochKey = genEpochKey(users[firstUser].id.identityNullifier, currentEpoch.toNumber(), epochKeyNonce, circuitEpochTreeDepth)
            const isProofValid = await unirepContract.verifyEpochKeyValidity(
                results.globalStateTree,
                results.epoch,
                results.epochKey,
                formatProofForVerifierContract(results.proof),
            )
            console.log(`Verifying epk proof with GSTreeRoot ${GSTree.root}, epoch ${currentEpoch} and epk ${firstUserEpochKey}`)
            expect(isProofValid, 'Verify epk proof on-chain failed').to.be.true
        })

        it('first user publish a post and generate epoch key', async () => {
            users[firstUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )
            const repNullifiersAmount = defaultPostReputation
            const epkNonce = 0
            const epochKey = genEpochKey(users[firstUser].id.identityNullifier, currentEpoch.toNumber(), epkNonce)
            const minRep = BigInt(defaultAirdroppedReputation)
            const proveGraffiti = BigInt(0)
            const graffitiPreImage = genRandomSalt()
            users[firstUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
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

            // User submit a post through Unirep Social should be found in Unirep Social Events
            const postFilter = unirepSocialContract.filters.PostSubmitted(currentEpoch, BigInt(postId), epochKey)
            const postEvents = await unirepSocialContract.queryFilter(postFilter)
            expect(postEvents.length).to.equal(1)

            secondEpochEpochKeys.push(results.epochKey)
            attestationsFromUnirepSocial++
            epochKeys[results.epochKey] = true
            // store reputation proof index
            const proofNullifier = await unirepContract.hashReputationProof(proofsRelated)
            reputationProofIndex = await unirepContract.getProofIndex(proofNullifier)

            console.log(`Attester attest to epk ${results.epochKey} with proof index ${reputationProofIndex.toNumber()}`)
        })

        it('Second user upvote to first user', async () => {
            users[secondUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[secondUser],
            )
            // gen nullifier nonce list
            const upvoteValue = 3
            const repNullifiersAmount = upvoteValue
            const epkNonce = 0

            // first user's epoch key
            const firstUserEpochKey = genEpochKey(users[firstUser].id.identityNullifier, currentEpoch.toNumber(), epkNonce)
            const minRep = BigInt(defaultAirdroppedReputation)
            const proveGraffiti = BigInt(0)
            const graffitiPreImage = genRandomSalt()
            const nonceList: BigInt[] = findValidNonce(users[secondUser], repNullifiersAmount, currentEpoch.toNumber(), BigInt(unirepSocialId))

            // second user's reputaiton proof
            const results = await users[secondUser].genProveReputationProof(BigInt(unirepSocialId), epkNonce, minRep, proveGraffiti, graffitiPreImage, nonceList)
            const isValid = await verifyProof(CircuitName.proveReputation, results.proof, results.publicSignals)
            expect(isValid, 'Verify reputation proof off-chain failed').to.be.true 
            const secondUserEpochKey = BigInt(results.epochKey)

            // submit vote
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

            // User submit a vote through Unirep Social should be found in Unirep Social Events
            const voteFilter = unirepSocialContract.filters.VoteSubmitted(currentEpoch, secondUserEpochKey, firstUserEpochKey)
            const voteEvents = await unirepSocialContract.queryFilter(voteFilter)
            expect(voteEvents.length).to.equal(1)

            secondEpochEpochKeys.push(secondUserEpochKey.toString())
            
            attestationsFromUnirepSocial += 2
            epochKeys[firstUserEpochKey.toString()] = true
            epochKeys[secondUserEpochKey.toString()] = true

            // compute reputation proof index
            const proofNullifier = await unirepContract.hashReputationProof(proofsRelated)
            const _reputationProofIndex = await unirepContract.getProofIndex(proofNullifier)
            console.log(`Attester attest to epk ${results.epochKey} with proof index ${_reputationProofIndex.toNumber()}`)
        })

        it('first user leave a comment and generate epoch key', async () => {
            users[firstUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )
            const repNullifiersAmount = defaultCommentReputation
            const epkNonce = 1
            const epochKey = genEpochKey(users[firstUser].id.identityNullifier, currentEpoch.toNumber(), epkNonce)
            const minRep = BigInt(defaultAirdroppedReputation)
            const proveGraffiti = BigInt(0)
            const graffitiPreImage = genRandomSalt()
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
            
            // submit comment
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
            expect(receipt.status, 'Submit post failed').to.equal(1)

            // User submit a comment through Unirep Social should be found in Unirep Social Events
            const commentFilter = unirepSocialContract.filters.CommentSubmitted(currentEpoch, BigInt(postId), epochKey)
            const commentEvents = await unirepSocialContract.queryFilter(commentFilter)
            expect(commentEvents.length).to.equal(1)

            secondEpochEpochKeys.push(epochKey.toString())
            attestationsFromUnirepSocial++
            epochKeys[epochKey.toString()] = true

            // compute reputation proof index
            const proofNullifier = await unirepContract.hashReputationProof(proofsRelated)
            const _reputationProofIndex = await unirepContract.getProofIndex(proofNullifier)
            console.log(`Attester attest to epk ${results.epochKey} with proof index ${_reputationProofIndex.toNumber()}`)
        })

        it('First user request Unirep Social for epoch transition airdrop', async () => {
            const proofResults = await users[firstUser].genUserSignUpProof(BigInt(unirepSocialId))
            const signUpProof = proofResults.publicSignals.concat([formatProofForVerifierContract(proofResults.proof)])

            // submit epoch key
            let tx = await unirepSocialContract.airdrop(signUpProof, {value: attestingFee})
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
            attestationsFromUnirepSocial++

            // compute reputation proof index
            const proofNullifier = await unirepContract.hashSignUpProof(signUpProof)
            const _reputationProofIndex = await unirepContract.getProofIndex(proofNullifier)
            console.log(`Attester attest to epk ${proofResults.epochKey} with proof index ${_reputationProofIndex.toNumber()}`)
        })

        it('Attestations gathered from events should match', async () => {
            // Gen Unirep State From Contract
            unirepState = await genUnirepStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
            )

            // First filter by epoch
            const attestationsByEpochFilter = unirepContract.filters.AttestationSubmitted(currentEpoch)
            const attestationsByEpochEvent = await unirepContract.queryFilter(attestationsByEpochFilter)
            expect(attestationsByEpochEvent.length, `Number of attestations submitted should be ${attestationsFromUnirepSocial}`).to.equal(attestationsFromUnirepSocial)

            // Second filter by attester
            const attestationsByAttesterFilter = unirepContract.filters.AttestationSubmitted(null, null, unirepSocialContract.address)
            const attestationsByAttesterEvent = await unirepContract.queryFilter(attestationsByAttesterFilter)
            expect(attestationsByAttesterEvent.length, `Number of attestations from Unirep Social should be ${attestationsFromUnirepSocial}`).to.equal(attestationsFromUnirepSocial)

            // Last filter by epoch key
            for (let epochKey of secondEpochEpochKeys) {
                console.log('second epoch epoch keys', epochKey)
                let attestationsByEpochKeyFilter = unirepContract.filters.AttestationSubmitted(null, BigInt(epochKey))
                let attestationsByEpochKeyEvent = await unirepContract.queryFilter(attestationsByEpochKeyFilter)
                let attestations_: IAttestation[] = attestationsByEpochKeyEvent.map((event: any) => event['args']['attestation'])

                let attestations: IAttestation[] = unirepState.getAttestations(epochKey)
                expect(attestationsByEpochKeyEvent.length, `Number of attestations to epk ${epochKey} should be ${attestations.length}`).to.equal(attestations.length)

                for (let i = 0; i < attestations_.length; i++) {
                    console.log(`Comparing attestation ${i} attesting to epk ${epochKey}`)
                    expect(attestations[i]['attesterId'], 'Mismatched attesterId').to.equal(attestations_[i]['attesterId'])
                    expect(attestations[i]['posRep'], 'Mismatched posRep').to.equal(attestations_[i]['posRep'])
                    expect(attestations[i]['negRep'], 'Mismatched negRep').to.equal(attestations_[i]['negRep'])
                    expect(attestations[i]['graffiti'], 'Mismatched graffiti').to.equal(attestations_[i]['graffiti'])
                    expect(attestations[i]['overwriteGraffiti'], 'Mismatched overwriteGraffiti').to.equal(attestations_[i]['overwriteGraffiti'])
                }
            }
        })

        it('Global state tree built from events should match', async () => {
            const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
            const newLeaves: BigInt[] = []

            for(const event of newLeafEvents){
                newLeaves.push(BigInt(event?.args?._hashedLeaf))
            }

            let observedGST = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)
            for(let leaf of newLeaves) {
                observedGST.insert(leaf)
            }
            expect(observedGST.root, 'GST root mismatch').to.equal(unirepState.genGSTree(currentEpoch.toNumber()).root)
        })
    })

    describe('Third epoch', () => {
        it('begin second epoch epoch transition', async () => {
            // Fast-forward epochLength of seconds
            await hardhatEthers.provider.send("evm_increaseTime", [epochLength])
            // Begin epoch transition
            let tx = await unirepContract.beginEpochTransition()
            let receipt = await tx.wait()
            expect(receipt.status, 'Epoch transition failed').to.equal(1)
            console.log(`Gas cost of epoch transition: ${receipt.gasUsed.toString()}`)

            currentEpoch = await unirepContract.currentEpoch()
            expect(currentEpoch, 'Current epoch should be 3').to.equal(3)

            unirepState = await genUnirepStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
            )
            console.log('----------------------Unirep State----------------------')
            console.log(unirepState.toJSON(4))
            console.log('------------------------------------------------------')

            userStateTransitionedNum[currentEpoch.toNumber()] = []
        })

        it('First user transition from second epoch', async () => {
            const fromEpoch = users[firstUser].latestTransitionedEpoch
            const fromEpochGSTree: IncrementalQuinTree = unirepState.genGSTree(fromEpoch)
            const GSTreeRoot = fromEpochGSTree.root
            const fromEpochTree = await unirepState.genEpochTree(fromEpoch)
            const epochTreeRoot = fromEpochTree.getRootHash()
            const epkNullifiers = users[firstUser].getEpochKeyNullifiers(fromEpoch)
            const proofIndexes: BigInt[] = []
            console.log('Processing first user\'s transition: ')
            console.log(`from epoch ${fromEpoch}, GSTreeRoot ${GSTreeRoot}, epochTreeRoot ${epochTreeRoot}`)
            console.log(`and epkNullifiers [${epkNullifiers}]`)

            users[firstUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )
            const results = await users[firstUser].genUserStateTransitionProofs()
            let isValid = await verifyProof(CircuitName.startTransition, results.startTransitionProof.proof, results.startTransitionProof.publicSignals)
            expect(isValid, 'Verify start transition circuit off-chain failed').to.be.true

            const blindedUserState = results.startTransitionProof.blindedUserState
            const blindedHashChain = results.startTransitionProof.blindedHashChain
            const globalStateTree = results.startTransitionProof.globalStateTreeRoot
            const proof = formatProofForVerifierContract(results.startTransitionProof.proof)
            let tx = await unirepSocialContract.startUserStateTransition(
                blindedUserState,
                blindedHashChain,
                globalStateTree,
                proof,
            )
            let receipt = await tx.wait()
            expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)

            let proofNullifier = await unirepContract.hashStartTransitionProof(
                blindedUserState,
                blindedHashChain,
                GSTreeRoot,
                proof
            )
            let proofIndex = await unirepContract.getProofIndex(proofNullifier)
            proofIndexes.push(BigInt(proofIndex))

            for (let i = 0; i < results.processAttestationProofs.length; i++) {
                isValid = await verifyProof(CircuitName.processAttestations, results.processAttestationProofs[i].proof, results.processAttestationProofs[i].publicSignals)
                expect(isValid, 'Verify process attestations circuit off-chain failed').to.be.true

                const outputBlindedUserState = results.processAttestationProofs[i].outputBlindedUserState
                const outputBlindedHashChain = results.processAttestationProofs[i].outputBlindedHashChain
                const inputBlindedUserState = results.processAttestationProofs[i].inputBlindedUserState

                tx = await unirepSocialContract.processAttestations(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(results.processAttestationProofs[i].proof),
                )
                receipt = await tx.wait()
                expect(receipt.status, 'Submit process attestations proof failed').to.equal(1)
                
                const proofNullifier = await unirepContract.hashProcessAttestationsProof(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(results.processAttestationProofs[i].proof),
                )
                const proofIndex = await unirepContract.getProofIndex(proofNullifier)
                proofIndexes.push(BigInt(proofIndex))
            }

            isValid = await verifyProof(CircuitName.userStateTransition, results.finalTransitionProof.proof, results.finalTransitionProof.publicSignals)
            expect(isValid, 'Verify user state transition circuit off-chain failed').to.be.true
            const newGSTLeaf = results.finalTransitionProof.newGlobalStateTreeLeaf

            const outputEpkNullifiers = results.finalTransitionProof.epochKeyNullifiers
            const blindedUserStates = results.finalTransitionProof.blindedUserStates
            const blindedHashChains = results.finalTransitionProof.blindedHashChains

            // Verify nullifiers outputted by circuit are the same as the ones computed off-chain
            const outputEPKNullifiers: BigInt[] = []
            for (let i = 0; i < epkNullifiers.length; i++) {
                const outputNullifier = results.finalTransitionProof.epochKeyNullifiers[i]
                expect(BigNumber.from(epkNullifiers[i])).to.equal(BigNumber.from(outputNullifier))
                outputEPKNullifiers.push(outputNullifier)
            }
            // Verify new state state outputted by circuit is the same as the one computed off-chain
            const newState = await users[firstUser].genNewUserStateAfterTransition()
            expect(newGSTLeaf, 'Computed new GST leaf should match').to.equal(newState.newGSTLeaf.toString())
            userStateLeavesAfterTransition[firstUser] = newState.newUSTLeaves
            userStateTransitionedNum[currentEpoch.toNumber()].push(newGSTLeaf)

            const transitionProof = [
                newGSTLeaf,
                outputEpkNullifiers,
                fromEpoch,
                blindedUserStates,
                GSTreeRoot,
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

            // Record state transition proof inputs to be used to submit duplicated proof
            duplicatedProofInputs = {
                "newGSTLeaf": newGSTLeaf,
                "epkNullifiers": outputEPKNullifiers,
                "blindedUserStates": blindedUserStates,
                "blindedHashChains": blindedHashChains,
                "fromEpoch": fromEpoch,
                "GSTreeRoot": GSTreeRoot,
                "epochTreeRoot": epochTreeRoot,
                "proof": formatProofForVerifierContract(results.finalTransitionProof.proof),
                "proofIndexes": proofIndexes,
            }
        })

        it('genUserStateFromContract should match', async () => {
            const userStateFromContract = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                users[firstUser].id,
            )
            console.log('----------------------User State----------------------')
            console.log(userStateFromContract.toJSON(4))
            console.log('------------------------------------------------------')

            expect(userStateFromContract.latestTransitionedEpoch).equal(currentEpoch)
            expect(userStateFromContract.latestGSTLeafIndex).not.equal(-1)
        })

        it('First user prove his reputation', async () => {
            const attesterId = BigInt(unirepSocialId)  // Prove reputation received from Unirep Social
            const proveGraffiti = BigInt(0)
            const minRep = BigInt(25)
            const epkNonce = 0
            const graffitiPreImage = genRandomSalt()
            users[firstUser] = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser],
            )

            console.log(`Proving reputation from attester ${attesterId} with minRep ${minRep} and graffitiPreimage ${graffitiPreImage}`)
            const results = await users[firstUser].genProveReputationProof(attesterId, epkNonce, minRep, proveGraffiti, graffitiPreImage)
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
        })

        it('First user submits duplicated state transition proof should fail', async () => {
            await expect(unirepContract.updateUserStateRoot([
                duplicatedProofInputs.newGSTLeaf,
                duplicatedProofInputs.epkNullifiers,
                duplicatedProofInputs.fromEpoch,
                duplicatedProofInputs.blindedUserStates,
                duplicatedProofInputs.GSTreeRoot,
                duplicatedProofInputs.blindedHashChains,
                duplicatedProofInputs.epochTreeRoot,
                duplicatedProofInputs.proof,
                ], duplicatedProofInputs.proofIndexes)
            ).to.be.revertedWith('Unirep: the proof has been submitted before')
        })
    })
})