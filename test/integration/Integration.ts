import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt, genIdentity, genIdentityCommitment, IncrementalQuinTree, stringifyBigInts, hash5, hashLeftRight, add0x } from '@unirep/crypto'
import { formatProofForVerifierContract, genProofAndPublicSignals, verifyProof } from '@unirep/circuits'
import { deployUnirep } from '@unirep/contracts'
import { attestingFee, circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitNullifierTreeDepth, circuitUserStateTreeDepth, epochLength, numAttestationsPerEpochKey, numEpochKeyNoncePerEpoch, maxReputationBudget, Attestation, UnirepState, UserState, IUserStateLeaf, computeEmptyUserStateRoot, IAttestation, IEpochTreeLeaf, genUserStateFromContract } from '@unirep/unirep'

import { genEpochKey, genNewSMT, getTreeDepthsForTesting, toCompleteHexString } from '../utils'
import UnirepSocial from "../../artifacts/contracts/UnirepSocial.sol/UnirepSocial.json"
import { DEFAULT_AIRDROPPED_KARMA, DEFAULT_COMMENT_KARMA, DEFAULT_POST_KARMA, MAX_KARMA_BUDGET } from '../../config/socialMedia'
import { deployUnirepSocial } from '../../core/utils'
describe('Integration', function () {
    this.timeout(500000)

    let unirepState: UnirepState
    let users: UserState[] = new Array(2)
    let attesters = new Array(2)
    let attesterSigs = new Array(2)
    const firstUser = 0
    const secondUser = 1
    const firstAttester = 0
    const secondAttester = 1

    // Data that are needed for verifying proof
    let userStateLeavesAfterTransition: IUserStateLeaf[][] = new Array(2)
    let graffitiPreImageMap = new Array(2)

    let unirepContract: ethers.Contract
    let unirepSocialContract: ethers.Contract
    let contractCalledByFirstAttester, contractCalledBySecondAttester
    let _treeDepths
    let unirepSocialId

    let prevEpoch: ethers.BigNumber
    let currentEpoch: ethers.BigNumber
    let emptyUserStateRoot: BigInt
    let blankGSLeaf: BigInt
    let userStateTransitionedNum: {[key: number]: ethers.BigNumber[]} = {}
    let epochKeys: {[key: string]: boolean} = {}

    let accounts: ethers.Signer[]

    let duplicatedProofInputs

    let postId = '123456'
    let commentId = '654321'
    let postText = 'postText'
    let commentText = 'commentText'

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        _treeDepths = getTreeDepthsForTesting("circuit")
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths)
        unirepSocialContract = await deployUnirepSocial(<ethers.Wallet>accounts[0], unirepContract.address)
        unirepSocialId = (await unirepContract.attesters(unirepSocialContract.address)).toNumber()

        currentEpoch = await unirepContract.currentEpoch()
        emptyUserStateRoot = computeEmptyUserStateRoot(circuitUserStateTreeDepth)
        blankGSLeaf = hashLeftRight(BigInt(0), emptyUserStateRoot)

        unirepState = new UnirepState(
            circuitGlobalStateTreeDepth,
            circuitUserStateTreeDepth,
            circuitEpochTreeDepth,
            attestingFee,
            epochLength,
            numEpochKeyNoncePerEpoch,
            maxReputationBudget,
        )
    })

    describe('First epoch', () => {
        it('First user signs up', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)

            const tx = await unirepSocialContract.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)

            const defaultLeafHash = hash5([])
            const leafValue = hash5([BigInt(DEFAULT_AIRDROPPED_KARMA), BigInt(0), BigInt(0), BigInt(1)])
            const tree = await genNewSMT(circuitUserStateTreeDepth, defaultLeafHash)
            await tree.update(BigInt(unirepSocialId), leafValue)
            const SMTRoot = await tree.getRootHash()
            const hashedStateLeaf = await unirepContract.hashStateLeaf([commitment, SMTRoot])

            // const hashedStateLeaf = await unirepContract.hashStateLeaf([commitment, emptyUserStateRoot])
            unirepState.signUp(currentEpoch.toNumber(), BigInt(hashedStateLeaf))
            users[firstUser] = new UserState(
                unirepState,
                id,
                commitment,
                false,
            )
            const latestTransitionedToEpoch = currentEpoch.toNumber()
            const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
            let GSTreeLeafIndex: number = -1
            let attesterId_ = 0
            let airdroppedReputation_ = 0
            for (let i = 0; i < newLeafEvents.length; i++) {
                if(BigInt(newLeafEvents[i]?.args?._hashedLeaf) == BigInt(hashedStateLeaf)){
                    GSTreeLeafIndex = newLeafEvents[i]?.args?._leafIndex.toNumber()
                    attesterId_ = newLeafEvents[i]?.args?._attesterId.toNumber()
                    airdroppedReputation_ = newLeafEvents[i]?.args?._airdropAmount.toNumber()
                }
            }
            expect(GSTreeLeafIndex).to.equal(0)
            expect(attesterId_).to.equal(unirepSocialId)
            expect(airdroppedReputation_).to.equal(DEFAULT_AIRDROPPED_KARMA)

            // User sign up through Unirep Social should be found in Unirep Social Events
            const userSignUpFilter = unirepSocialContract.filters.UserSignedUp(currentEpoch)
            const userSignUpEvents = await unirepSocialContract.queryFilter(userSignUpFilter)
            expect(userSignUpEvents.length).to.equal(1)
            
            users[firstUser].signUp(latestTransitionedToEpoch, GSTreeLeafIndex, attesterId_, airdroppedReputation_)
            console.log(`First user signs up with commitment (${commitment}), in epoch ${latestTransitionedToEpoch} and GST leaf ${GSTreeLeafIndex}`)
            console.log('----------------------User State----------------------')
            console.log(users[firstUser].toJSON(4))
            console.log('------------------------------------------------------')
        })

        it('Global state tree built from events should match', async () => {
            const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)

            const stateTransitionByEpochFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const stateTransitionByEpochEvents = await unirepContract.queryFilter(stateTransitionByEpochFilter)

            let newLeaves = new Array(newLeafEvents.length + stateTransitionByEpochEvents.length)

            for(const event of newLeafEvents){
                const leafIndex = event?.args?._leafIndex
                newLeaves[leafIndex] = event?.args?._hashedLeaf
            }

            for(const event of stateTransitionByEpochEvents){
                const leafIndex = event?.args?._leafIndex
                newLeaves[leafIndex] = event?.args?.userTransitionedData?.newGlobalStateTreeLeaf
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
            prevEpoch = currentEpoch
            // Fast-forward epochLength of seconds
            await hardhatEthers.provider.send("evm_increaseTime", [epochLength])
            // Begin epoch transition
            const numEpochKeysToSeal = await unirepContract.getNumEpochKey(currentEpoch)
            let tx = await unirepContract.beginEpochTransition(numEpochKeysToSeal)
            let receipt = await tx.wait()
            expect(receipt.status, 'Epoch transition failed').to.equal(1)
            console.log(`Gas cost of epoch transition(sealing hash chain of ${numEpochKeysToSeal} epoch keys): ${receipt.gasUsed.toString()}`)

            currentEpoch = await unirepContract.currentEpoch()
            expect(currentEpoch, 'Current epoch should be 2').to.equal(2)

            await unirepState.epochTransition(prevEpoch.toNumber(), [])
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
            console.log('Processing first user\'s transition: ')
            console.log(`from epoch ${fromEpoch}, GSTreeRoot ${GSTreeRoot}, epochTreeRoot ${epochTreeRoot}`)
            console.log(`and epkNullifiers [${epkNullifiers}]`)

            const results = await users[firstUser].genUserStateTransitionProofs()
            let isValid = await verifyProof('startTransition', results.startTransitionProof.proof, results.startTransitionProof.publicSignals)
            expect(isValid, 'Verify start transition circuit off-chain failed').to.be.true

            const blindedUserState = results.startTransitionProof.blindedUserState
            const blindedHashChain = results.startTransitionProof.blindedHashChain
            let tx = await unirepSocialContract.startUserStateTransition(
                blindedUserState,
                blindedHashChain,
                results.startTransitionProof.globalStateTreeRoot,
                formatProofForVerifierContract(results.startTransitionProof.proof),
            )
            let receipt = await tx.wait()
            expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
            unirepState.addBlindedUserState(blindedUserState)
            unirepState.addBlindedHashChain(blindedHashChain)

            for (let i = 0; i < results.processAttestationProofs.length; i++) {
                isValid = await verifyProof('processAttestations', results.processAttestationProofs[i].proof, results.processAttestationProofs[i].publicSignals)
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
                unirepState.addBlindedUserState(outputBlindedUserState)
                unirepState.addBlindedHashChain(outputBlindedHashChain)
            }

            isValid = await verifyProof('userStateTransition', results.finalTransitionProof.proof, results.finalTransitionProof.publicSignals)
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

            tx = await unirepSocialContract.updateUserStateRoot(
                newGSTLeaf,
                outputEpkNullifiers,
                blindedUserStates,
                blindedHashChains,
                fromEpoch,
                GSTreeRoot,
                epochTreeRoot,
                formatProofForVerifierContract(results.finalTransitionProof.proof),
            )
            receipt = await tx.wait()
            expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
        })

        it('Verify state transition of first user\'s epoch transition', async () => {
            // TODO verify process attestatoin proofs and start transition proofs

            const stateTransitionByEpochFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const stateTransitionByEpochEvent = await unirepContract.queryFilter(stateTransitionByEpochFilter)
            expect(stateTransitionByEpochEvent.length, `Number of state transition events current epoch should be ${userStateTransitionedNum[currentEpoch.toNumber()].length}`).to.equal(userStateTransitionedNum[currentEpoch.toNumber()].length)

            const stateTransitionArgs: any = stateTransitionByEpochEvent[0]['args']

            // Check if all blinded hashcahins and user states submitted before
            const _blindedUserState = stateTransitionArgs['userTransitionedData']['blindedUserStates'].map(n=> n.toString())
            const _blindedHashChain = stateTransitionArgs['userTransitionedData']['blindedHashChains'].map(n=> n.toString())
            for (let i = 0; i < 2; i++) {
                expect(unirepState.blindedUserStateExist(_blindedUserState[i])).to.be.true
            }
            for (let i = 0; i < numEpochKeyNoncePerEpoch; i++) {
                expect(unirepState.blindedHashChainExist(_blindedHashChain[i])).to.be.true
            }

            // Verify on-chain
            const isProofValid = await unirepContract.verifyUserStateTransition(
                stateTransitionArgs['userTransitionedData']['newGlobalStateTreeLeaf'],
                stateTransitionArgs['userTransitionedData']['epkNullifiers'],
                stateTransitionArgs['userTransitionedData']['fromEpoch'],
                stateTransitionArgs['userTransitionedData']['blindedUserStates'],
                stateTransitionArgs['userTransitionedData']['fromGlobalStateTree'],
                stateTransitionArgs['userTransitionedData']['blindedHashChains'],
                stateTransitionArgs['userTransitionedData']['fromEpochTree'],
                stateTransitionArgs['userTransitionedData']['proof'],
            )
            expect(isProofValid, 'Verify user state transition on-chain failed').to.be.true
            
            const epkNullifiers = stateTransitionArgs['userTransitionedData']['epkNullifiers']

            const latestUserStateLeaves = userStateLeavesAfterTransition[firstUser]  // Leaves should be empty as no reputations are given yet
            users[firstUser].transition(latestUserStateLeaves)
            console.log(`First user finish state transition. AttesterIds in UST: [${latestUserStateLeaves.map((l) => l.attesterId.toString())}]`)
            expect(users[firstUser].latestTransitionedEpoch, 'First user should transition to current epoch').to.equal(currentEpoch.toNumber())

            unirepState.userStateTransition(currentEpoch.toNumber(), BigInt(stateTransitionArgs['userTransitionedData']['newGlobalStateTreeLeaf']), epkNullifiers)
            console.log('User state transition off-chain: ')
            console.log(`newGSTLeaf ${BigInt(stateTransitionArgs['userTransitionedData']['newGlobalStateTreeLeaf'])} and epk nullifier ${epkNullifiers}`)
            console.log('----------------------User State----------------------')
            console.log(users[firstUser].toJSON(4))
            console.log('------------------------------------------------------')

            // User state transition through Unirep Social should be found in Unirep Social Events
            const userStateTransitionFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const userStateTransitionEvents = await unirepContract.queryFilter(userStateTransitionFilter)
            let foundIdx = false
            for (let i = 0; i < userStateTransitionEvents.length; i++) {
                if(userStateTransitionEvents[i]?.args?._leafIndex.eq(stateTransitionArgs['_leafIndex'])) foundIdx = true
            }
            expect(foundIdx).to.be.true
        })

        it('Second user signs up', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)

            const tx = await unirepSocialContract.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)

            const defaultLeafHash = hash5([])
            const leafValue = hash5([BigInt(DEFAULT_AIRDROPPED_KARMA), BigInt(0), BigInt(0), BigInt(1)])
            const tree = await genNewSMT(circuitUserStateTreeDepth, defaultLeafHash)
            await tree.update(BigInt(unirepSocialId), leafValue)
            const SMTRoot = await tree.getRootHash()
            const hashedStateLeaf = await unirepContract.hashStateLeaf([commitment, SMTRoot])

            unirepState.signUp(currentEpoch.toNumber(), BigInt(hashedStateLeaf.toString()))
            users[secondUser] = new UserState(
                unirepState,
                id,
                commitment,
                false,
            )
            const latestTransitionedToEpoch = currentEpoch.toNumber()
            const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
            let GSTreeLeafIndex: number = -1
            let attesterId_ = 0
            let airdroppedReputation_ = 0
            for (let i = 0; i < newLeafEvents.length; i++) {
                if(BigInt(newLeafEvents[i]?.args?._hashedLeaf) == BigInt(hashedStateLeaf)){
                    GSTreeLeafIndex = newLeafEvents[i]?.args?._leafIndex.toNumber()
                    attesterId_ = newLeafEvents[i]?.args?._attesterId.toNumber()
                    airdroppedReputation_ = newLeafEvents[i]?.args?._airdropAmount.toNumber()
                }
            }
            expect(GSTreeLeafIndex).to.equal(1)
            expect(attesterId_).to.equal(unirepSocialId)
            expect(airdroppedReputation_).to.equal(DEFAULT_AIRDROPPED_KARMA)

            // User sign up through Unirep Social should be found in Unirep Social Events
            const userSignUpFilter = unirepSocialContract.filters.UserSignedUp(currentEpoch)
            const userSignUpEvents = await unirepSocialContract.queryFilter(userSignUpFilter)
            expect(userSignUpEvents.length).to.equal(1)

            users[secondUser].signUp(latestTransitionedToEpoch, GSTreeLeafIndex, attesterId_, airdroppedReputation_)
            console.log(`Second user signs up with commitment (${commitment}), in epoch ${latestTransitionedToEpoch} and GST leaf ${GSTreeLeafIndex}`)
            console.log('----------------------User State----------------------')
            console.log(users[secondUser].toJSON(4))
            console.log('------------------------------------------------------')
        })

        it('first user generate an epoch key and verify it', async () => {
            const epochKeyNonce = 0
            const results = await users[firstUser].genVerifyEpochKeyProof(epochKeyNonce)
            const isValid = await verifyProof('verifyEpochKey', results.proof, results.publicSignals)
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
            const repNullifiersAmount = DEFAULT_POST_KARMA
            const epkNonce = 0
            const epochKey = genEpochKey(users[firstUser].id.identityNullifier, currentEpoch.toNumber(), epkNonce)
            const minRep = BigInt(DEFAULT_AIRDROPPED_KARMA)
            const proveGraffiti = BigInt(0)
            const graffitiPreImage = genRandomSalt()
            const results = await users[firstUser].genProveReputationProof(BigInt(unirepSocialId), repNullifiersAmount, epkNonce, minRep, proveGraffiti, graffitiPreImage)
            const isValid = await verifyProof('proveReputation', results.proof, results.publicSignals)
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
            
            const publicSignals = [
                results.epochKey,
                results.globalStatetreeRoot,
                results.attesterId,
                results.proveReputationAmount,
                results.minRep,
                results.proveGraffiti,
                results.graffitiPreImage,
                formatProofForVerifierContract(results.proof)
            ]

            const tx = await unirepSocialContract.publishPost(
                postId, 
                postText, 
                results.reputationNullifiers,
                publicSignals,
                { value: attestingFee, gasLimit: 1000000 }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit post failed').to.equal(1)

            for (let i = 0; i < MAX_KARMA_BUDGET; i++) {
                unirepState.addReputationNullifiers(results.reputationNullifiers[i])
            }

            // User submit a post through Unirep Social should be found in Unirep Social Events
            const postFilter = unirepSocialContract.filters.PostSubmitted(currentEpoch, BigInt(postId), epochKey)
            const postEvents = await unirepSocialContract.queryFilter(postFilter)
            expect(postEvents.length).to.equal(1)

            const attestationToEpochKey = new Attestation(
                BigInt(unirepSocialId),
                BigInt(0),
                BigInt(DEFAULT_POST_KARMA),
                BigInt(0),
                BigInt(0),
            )

            secondEpochEpochKeys.push(results.epochKey)
            unirepState.addAttestation(results.epochKey, attestationToEpochKey)
            attestationsFromUnirepSocial++
            epochKeys[results.epochKey] = true
        })

        it('Second user upvote to first user', async () => {
            // gen nullifier nonce list
            const upvoteValue = 3
            const repNullifiersAmount = upvoteValue
            const epkNonce = 0

            // first user's epoch key
            const firstUserEpochKey = genEpochKey(users[firstUser].id.identityNullifier, currentEpoch.toNumber(), epkNonce)
            const minRep = BigInt(DEFAULT_AIRDROPPED_KARMA)
            const proveGraffiti = BigInt(0)
            const graffitiPreImage = genRandomSalt()

            // second user's reputaiton proof
            const results = await users[secondUser].genProveReputationProof(BigInt(unirepSocialId), repNullifiersAmount, epkNonce, minRep, proveGraffiti, graffitiPreImage)
            const isValid = await verifyProof('proveReputation', results.proof, results.publicSignals)
            expect(isValid, 'Verify reputation proof off-chain failed').to.be.true 
            const secondUserEpochKey = BigInt(results.epochKey)

            // submit vote
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
                firstUserEpochKey,
                results.reputationNullifiers,
                proofsRelated,
                { value: attestingFee.mul(2), gasLimit: 1000000 }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit vote failed').to.equal(1)

            for (let i = 0; i < MAX_KARMA_BUDGET; i++) {
                unirepState.addReputationNullifiers(results.reputationNullifiers[i])
            }

            // format attestation
            const attestationToFirstUser = new Attestation(
                BigInt(unirepSocialId),
                BigInt(upvoteValue),
                BigInt(0),
                BigInt(0),
                BigInt(0),
            )
            
            const attestationToSecondUser = new Attestation(
                BigInt(unirepSocialId),
                BigInt(0),
                BigInt(upvoteValue),
                BigInt(0),
                BigInt(0),
            )

            // User submit a vote through Unirep Social should be found in Unirep Social Events
            const voteFilter = unirepSocialContract.filters.VoteSubmitted(currentEpoch, secondUserEpochKey, firstUserEpochKey)
            const voteEvents = await unirepSocialContract.queryFilter(voteFilter)
            expect(voteEvents.length).to.equal(1)

            secondEpochEpochKeys.push(secondUserEpochKey.toString())
            
            unirepState.addAttestation(secondUserEpochKey.toString(), attestationToSecondUser)
            unirepState.addAttestation(firstUserEpochKey.toString(), attestationToFirstUser)
            attestationsFromUnirepSocial += 2
            epochKeys[firstUserEpochKey.toString()] = true
            epochKeys[secondUserEpochKey.toString()] = true
        })

        it('first user leave a comment and generate epoch key', async () => {
            const repNullifiersAmount = DEFAULT_COMMENT_KARMA
            const epkNonce = 1
            const epochKey = genEpochKey(users[firstUser].id.identityNullifier, currentEpoch.toNumber(), epkNonce)
            const minRep = BigInt(DEFAULT_AIRDROPPED_KARMA)
            const proveGraffiti = BigInt(0)
            const graffitiPreImage = genRandomSalt()
            const results = await users[firstUser].genProveReputationProof(BigInt(unirepSocialId), repNullifiersAmount, epkNonce, minRep, proveGraffiti, graffitiPreImage)
            const isValid = await verifyProof('proveReputation', results.proof, results.publicSignals)
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
            const publicSignals = [
                results.epochKey,
                results.globalStatetreeRoot,
                results.attesterId,
                results.proveReputationAmount,
                results.minRep,
                results.proveGraffiti,
                results.graffitiPreImage,
                formatProofForVerifierContract(results.proof)
            ]

            const tx = await unirepSocialContract.leaveComment(
                postId, 
                commentId,
                commentText, 
                results.reputationNullifiers,
                publicSignals,
                { value: attestingFee, gasLimit: 1000000 }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit post failed').to.equal(1)

            for (let i = 0; i < MAX_KARMA_BUDGET; i++) {
                unirepState.addReputationNullifiers(results.reputationNullifiers[i])
            }

            // format attestation
            const attestationToEpochKey = new Attestation(
                BigInt(unirepSocialId),
                BigInt(0),
                BigInt(DEFAULT_COMMENT_KARMA),
                BigInt(0),
                BigInt(0),
            )

            // User submit a comment through Unirep Social should be found in Unirep Social Events
            const commentFilter = unirepSocialContract.filters.CommentSubmitted(currentEpoch, BigInt(postId), epochKey)
            const commentEvents = await unirepSocialContract.queryFilter(commentFilter)
            expect(commentEvents.length).to.equal(1)

            secondEpochEpochKeys.push(epochKey.toString())
            unirepState.addAttestation(epochKey.toString(), attestationToEpochKey)
            attestationsFromUnirepSocial++
            epochKeys[epochKey.toString()] = true
        })

        it('First user request Unirep Social for epoch transition airdrop', async () => {
            const nonce = 0
            const epochKeyProof = await users[firstUser].genVerifyEpochKeyProof(nonce)

            // submit epoch key
            let tx = await unirepSocialContract.airdrop(epochKeyProof.epochKey, {value: attestingFee})
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
            const attestationToEpochKey = new Attestation(
                BigInt(unirepSocialId),
                BigInt(DEFAULT_AIRDROPPED_KARMA),
                BigInt(0),
                BigInt(0),
                BigInt(0),
            )
            unirepState.addAttestation(epochKeyProof.epochKey, attestationToEpochKey)
            attestationsFromUnirepSocial++
        })

        it('Attestations gathered from events should match', async () => {
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

            const stateTransitionByEpochFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const stateTransitionByEpochEvents = await unirepContract.queryFilter(stateTransitionByEpochFilter)

            let newLeaves = new Array(newLeafEvents.length + stateTransitionByEpochEvents.length)

            for(const event of newLeafEvents){
                const leafIndex = event?.args?._leafIndex
                newLeaves[leafIndex] = event?.args?._hashedLeaf
            }

            for(const event of stateTransitionByEpochEvents){
                const leafIndex = event?.args?._leafIndex
                newLeaves[leafIndex] = event?.args?.userTransitionedData?.newGlobalStateTreeLeaf
            }

            let observedGST = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)
            for(let leaf of newLeaves) {
                // Only insert non-zero leaf
                if (leaf.gt(0)) observedGST.insert(leaf)
            }
            expect(observedGST.root, 'GSTreeRoot mismatched').to.equal(unirepState.genGSTree(currentEpoch.toNumber()).root)
        })
    })

    describe('Third epoch', () => {
        it('begin second epoch epoch transition', async () => {
            prevEpoch = currentEpoch
            // Fast-forward epochLength of seconds
            await hardhatEthers.provider.send("evm_increaseTime", [epochLength])
            // Begin epoch transition
            const numEpochKeysToSeal = await unirepContract.getNumEpochKey(currentEpoch)
            let tx = await unirepContract.beginEpochTransition(numEpochKeysToSeal)
            let receipt = await tx.wait()
            expect(receipt.status, 'Epoch transition failed').to.equal(1)
            console.log(`Gas cost of epoch transition(sealing hash chain of ${numEpochKeysToSeal} epoch keys): ${receipt.gasUsed.toString()}`)

            currentEpoch = await unirepContract.currentEpoch()
            expect(currentEpoch, 'Current epoch should be 3').to.equal(3)

            let [epochKeys_, epochKeyHashchains_] = await unirepContract.getEpochTreeLeaves(prevEpoch)
            expect(epochKeys_.length, `Number of epoch keys last epoch should be ${Object.keys(epochKeys).length}`).to.equal(Object.keys(epochKeys).length)

            epochKeys_ = epochKeys_.map((epk) => epk.toString())
            epochKeyHashchains_ = epochKeyHashchains_.map((hc) => hc.toString())
            // Add epoch tree leaves to unirepState
            const epochTreeLeaves: IEpochTreeLeaf[] = []
            for (let i = 0; i < epochKeys_.length; i++) {
                const epochTreeLeaf: IEpochTreeLeaf = {
                    epochKey: BigInt(epochKeys_[i]),
                    hashchainResult: BigInt(epochKeyHashchains_[i])
                }
                epochTreeLeaves.push(epochTreeLeaf)
            }

            await unirepState.epochTransition(prevEpoch.toNumber(), epochTreeLeaves)
            console.log(`Updating epoch tree leaves off-chain with list of epoch keys: [${epochTreeLeaves.map((l) => l.epochKey.toString())}]`)
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
            console.log('Processing first user\'s transition: ')
            console.log(`from epoch ${fromEpoch}, GSTreeRoot ${GSTreeRoot}, epochTreeRoot ${epochTreeRoot}`)
            console.log(`and epkNullifiers [${epkNullifiers}]`)

            const results = await users[firstUser].genUserStateTransitionProofs()
            let isValid = await verifyProof('startTransition', results.startTransitionProof.proof, results.startTransitionProof.publicSignals)
            expect(isValid, 'Verify start transition circuit off-chain failed').to.be.true

            const blindedUserState = results.startTransitionProof.blindedUserState
            const blindedHashChain = results.startTransitionProof.blindedHashChain
            let tx = await unirepSocialContract.startUserStateTransition(
                blindedUserState,
                blindedHashChain,
                results.startTransitionProof.globalStateTreeRoot,
                formatProofForVerifierContract(results.startTransitionProof.proof),
            )
            let receipt = await tx.wait()
            expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
            unirepState.addBlindedUserState(blindedUserState)
            unirepState.addBlindedHashChain(blindedHashChain)

            for (let i = 0; i < results.processAttestationProofs.length; i++) {
                isValid = await verifyProof('processAttestations', results.processAttestationProofs[i].proof, results.processAttestationProofs[i].publicSignals)
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
                unirepState.addBlindedUserState(outputBlindedUserState)
                unirepState.addBlindedHashChain(outputBlindedHashChain)
            }

            isValid = await verifyProof('userStateTransition', results.finalTransitionProof.proof, results.finalTransitionProof.publicSignals)
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

            tx = await unirepSocialContract.updateUserStateRoot(
                newGSTLeaf,
                outputEpkNullifiers,
                blindedUserStates,
                blindedHashChains,
                fromEpoch,
                GSTreeRoot,
                epochTreeRoot,
                formatProofForVerifierContract(results.finalTransitionProof.proof),
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
            }
        })

        it('Verify state transition of first user\'s epoch transition', async () => {
            // TODO verify process attestatoin proofs and start transition proofs

            const stateTransitionByEpochFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const stateTransitionByEpochEvent = await unirepContract.queryFilter(stateTransitionByEpochFilter)
            expect(stateTransitionByEpochEvent.length, `Number of state transition events current epoch should be ${userStateTransitionedNum[currentEpoch.toNumber()].length}`).to.equal(userStateTransitionedNum[currentEpoch.toNumber()].length)

            const stateTransitionArgs: any = stateTransitionByEpochEvent[0]['args']

            // Check if all blinded hashcahins and user states submitted before
            const _blindedUserState = stateTransitionArgs['userTransitionedData']['blindedUserStates'].map(n=> n.toString())
            const _blindedHashChain = stateTransitionArgs['userTransitionedData']['blindedHashChains'].map(n=> n.toString())
            for (let i = 0; i < 2; i++) {
                expect(unirepState.blindedUserStateExist(_blindedUserState[i])).to.be.true
            }
            for (let i = 0; i < numEpochKeyNoncePerEpoch; i++) {
                expect(unirepState.blindedHashChainExist(_blindedHashChain[i])).to.be.true
            }

            // Verify on-chain
            const isProofValid = await unirepContract.verifyUserStateTransition(
                stateTransitionArgs['userTransitionedData']['newGlobalStateTreeLeaf'],
                stateTransitionArgs['userTransitionedData']['epkNullifiers'],
                stateTransitionArgs['userTransitionedData']['fromEpoch'],
                stateTransitionArgs['userTransitionedData']['blindedUserStates'],
                stateTransitionArgs['userTransitionedData']['fromGlobalStateTree'],
                stateTransitionArgs['userTransitionedData']['blindedHashChains'],
                stateTransitionArgs['userTransitionedData']['fromEpochTree'],
                stateTransitionArgs['userTransitionedData']['proof'],
            )
            expect(isProofValid, 'Verify user state transition on-chain failed').to.be.true
            
            const epkNullifiers = stateTransitionArgs['userTransitionedData']['epkNullifiers']

            const latestUserStateLeaves = userStateLeavesAfterTransition[firstUser]  // Leaves should be empty as no reputations are given yet
            users[firstUser].transition(latestUserStateLeaves)
            console.log(`First user finish state transition. AttesterIds in UST: [${latestUserStateLeaves.map((l) => l.attesterId.toString())}]`)
            expect(users[firstUser].latestTransitionedEpoch, 'First user should transition to current epoch').to.equal(currentEpoch.toNumber())

            unirepState.userStateTransition(currentEpoch.toNumber(), BigInt(stateTransitionArgs['userTransitionedData']['newGlobalStateTreeLeaf']), epkNullifiers)
            console.log('User state transition off-chain: ')
            console.log(`newGSTLeaf ${BigInt(stateTransitionArgs['userTransitionedData']['newGlobalStateTreeLeaf'])} and epk nullifier ${epkNullifiers}`)
            console.log('----------------------User State----------------------')
            console.log(users[firstUser].toJSON(4))
            console.log('------------------------------------------------------')

            // User state transition through Unirep Social should be found in Unirep Social Events
            const userStateTransitionFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const userStateTransitionEvents = await unirepContract.queryFilter(userStateTransitionFilter)
            let foundIdx = false
            for (let i = 0; i < userStateTransitionEvents.length; i++) {
                if(userStateTransitionEvents[i]?.args?._leafIndex.eq(stateTransitionArgs['_leafIndex'])) foundIdx = true
            }
            expect(foundIdx).to.be.true
        })

        it('First user prove his reputation', async () => {
            const attesterId = BigInt(unirepSocialId)  // Prove reputation received from Unirep Social
            const proveGraffiti = BigInt(0)
            const minRep = BigInt(25)
            const repNullifiersAmount = 0
            const epkNonce = 0
            const graffitiPreImage = genRandomSalt()
            console.log(`Proving reputation from attester ${attesterId} with minRep ${minRep} and graffitiPreimage ${graffitiPreImage}`)
            const results = await users[firstUser].genProveReputationProof(attesterId, repNullifiersAmount, epkNonce, minRep, proveGraffiti, graffitiPreImage)
            const isValid = await verifyProof('proveReputation', results.proof, results.publicSignals)
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

        it('First user submits duplicated state transition proof', async () => {
            let tx = await unirepContract.updateUserStateRoot(
                duplicatedProofInputs["newGSTLeaf"],
                duplicatedProofInputs["epkNullifiers"],
                duplicatedProofInputs["blindedUserStates"],
                duplicatedProofInputs["blindedHashChains"],
                duplicatedProofInputs["fromEpoch"],
                duplicatedProofInputs["GSTreeRoot"],
                duplicatedProofInputs["epochTreeRoot"],
                duplicatedProofInputs["proof"],
            )
            let receipt = await tx.wait()
            expect(receipt.status, 'Submit duplicated user state transition proof failed').to.equal(1)
        })

        it('genUserStateFromContract should return equivalent UserState and UnirepState', async () => {
            const userStateFromContract = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                0,
                users[firstUser].id,
                users[firstUser].commitment,
            )
            console.log(userStateFromContract.toJSON(4))

            // Check user state matches
            expect(users[firstUser].latestTransitionedEpoch, 'First user latest transitioned epoch mismatch').to.equal(userStateFromContract.latestTransitionedEpoch)
            expect(users[firstUser].latestGSTLeafIndex, 'First user latest GST leaf index mismatch').to.equal(userStateFromContract.latestGSTLeafIndex)
            expect((await users[firstUser].genUserStateTree()).getRootHash(), 'First user UST mismatch').to.equal((await userStateFromContract.genUserStateTree()).getRootHash())

            // Check unirep state matches
            expect(unirepState.currentEpoch, 'Unirep state current epoch mismatch').to.equal(userStateFromContract.getUnirepStateCurrentEpoch())
            for (let epoch = 1; epoch <= unirepState.currentEpoch; epoch++) {
                const GST = unirepState.genGSTree(epoch)
                const _GST = userStateFromContract.getUnirepStateGSTree(epoch)
                expect(GST.root, `Epoch ${epoch} GST root mismatch`).to.equal(_GST.root)

                if (epoch != unirepState.currentEpoch) {
                    const epochTree = await unirepState.genEpochTree(epoch)
                    const _epochTree = await userStateFromContract.getUnirepStateEpochTree(epoch)
                    expect(epochTree.getRootHash(), `Epoch ${epoch} epoch tree root mismatch`).to.equal(_epochTree.getRootHash())
                }
            }
        })
    })
})