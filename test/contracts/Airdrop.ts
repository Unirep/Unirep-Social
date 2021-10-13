import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt, hash5, hashLeftRight, genIdentity, genIdentityCommitment } from '@unirep/crypto'
import { verifyProof, formatProofForVerifierContract } from '@unirep/circuits'
import { deployUnirep } from '@unirep/contracts'
import { attestingFee, circuitUserStateTreeDepth, epochLength, maxReputationBudget, numEpochKeyNoncePerEpoch, UnirepState, UserState, getTreeDepthsForTesting, IEpochTreeLeaf, Attestation } from '@unirep/unirep'

import { genNewSMT } from '../utils'
import { deployUnirepSocial } from '../../core/utils'
import { DEFAULT_AIRDROPPED_KARMA } from '../../config/socialMedia'

describe('Airdrop', function () {
    this.timeout(100000)

    let unirepContract, unirepSocialContract
    let unirepState
    let userState

    let accounts: ethers.Signer[]

    let numLeaf = 0

    let attester, attesterId, unirepContractCalledByAttester

    const repNullifiersAmount = 0
    const epkNonce = 0
    const proofIndexes: BigInt[] = []

    before(async () => {
        accounts = await hardhatEthers.getSigners()
        const _treeDepths = getTreeDepthsForTesting('circuit')
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths)
        unirepSocialContract = await deployUnirepSocial(<ethers.Wallet>accounts[0], unirepContract.address)
        unirepState = new UnirepState(
            _treeDepths.globalStateTreeDepth,
            _treeDepths.userStateTreeDepth,
            _treeDepths.epochTreeDepth,
            attestingFee,
            epochLength,
            numEpochKeyNoncePerEpoch,
            maxReputationBudget,
        )
    })

    it('compute SMT root should succeed', async () => {
        const leafIdx = BigInt(Math.floor(Math.random() * (2** circuitUserStateTreeDepth)))
        const leafValue = genRandomSalt()
        const oneLeafUSTRoot = await unirepContract.calcAirdropUSTRoot(leafIdx, leafValue)

        const defaultLeafHash = hash5([])
        const tree = await genNewSMT(circuitUserStateTreeDepth, defaultLeafHash)
        await tree.update(leafIdx, leafValue)
        const SMTRoot = await tree.getRootHash()

        expect(oneLeafUSTRoot, 'airdrop root does not match').equal(SMTRoot)
    })

    it('attester signs up and attester sets airdrop amount should succeed', async() => {
        console.log('Attesters sign up')
        attester = accounts[1]
        unirepContractCalledByAttester = unirepContract.connect(attester)
        let tx = await unirepContractCalledByAttester.attesterSignUp()
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        attesterId = await unirepContract.attesters(unirepSocialContract.address)
        expect(attesterId).not.equal(0)
        const airdropAmount = await unirepContract.airdropAmount(unirepSocialContract.address)
        expect(airdropAmount).equal(DEFAULT_AIRDROPPED_KARMA)
    })

    it('user signs up through unirep social should get airdrop pos rep', async() => {
        console.log('User sign up')
        const userId = genIdentity()
        const userCommitment = genIdentityCommitment(userId)
        let tx = await unirepSocialContract.userSignUp(userCommitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const newGSTLeafInsertedFilter = unirepContract.filters.NewGSTLeafInserted()
        const newGSTLeafInsertedEvents =  await unirepContract.queryFilter(newGSTLeafInsertedFilter)
        const newGSTLeaf = newGSTLeafInsertedEvents[numLeaf].args._hashedLeaf
        numLeaf ++

        // expected airdropped user state
        const defaultLeafHash = hash5([])
        const leafValue = hash5([BigInt(DEFAULT_AIRDROPPED_KARMA), BigInt(0), BigInt(0), BigInt(1)])
        const tree = await genNewSMT(circuitUserStateTreeDepth, defaultLeafHash)
        await tree.update(BigInt(attesterId), leafValue)
        const SMTRoot = await tree.getRootHash()
        const hashedLeaf = hashLeftRight(userCommitment, SMTRoot)
        expect(newGSTLeaf).equal(hashedLeaf)

        // user can prove airdrop pos rep
        const currentEpoch = await unirepContract.currentEpoch()

        unirepState.signUp(currentEpoch.toNumber(), BigInt(newGSTLeaf))
        userState = new UserState(
            unirepState,
            userId,
            userCommitment,
            false,
        )
        const latestTransitionedToEpoch = currentEpoch.toNumber()
        const GSTreeLeafIndex = 0
        userState.signUp(latestTransitionedToEpoch, GSTreeLeafIndex, attesterId, DEFAULT_AIRDROPPED_KARMA)
        const proveGraffiti = 0
        const minPosRep = 19, graffitiPreImage = 0
        const results = await userState.genProveReputationProof(BigInt(attesterId), repNullifiersAmount, epkNonce, minPosRep, proveGraffiti, graffitiPreImage)
        const isValid = await verifyProof('proveReputation', results.proof, results.publicSignals)
        expect(isValid, 'Verify reputation proof off-chain failed').to.be.true
    })

    it('user can get airdrop positive reputation through calling airdrop function in Unirep Social', async() => {
        const nonce = 0
        const proofResults = await userState.genUserSignUpProof(BigInt(attesterId))
        const signUpProof = proofResults.publicSignals.concat([formatProofForVerifierContract(proofResults.proof)])

        const isSignUpProofValid = await unirepSocialContract.verifyUserSignUp(
            proofResults.epoch,
            proofResults.epochKey,
            proofResults.globalStateTreeRoot,
            proofResults.attesterId,
            formatProofForVerifierContract(proofResults.proof),
        )
        expect(isSignUpProofValid, 'Sign up proof is not valid').to.be.true

        // submit epoch key
        let tx = await unirepSocialContract.airdrop(signUpProof, {value: attestingFee})
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)
        const attestationToEpochKey = new Attestation(
            BigInt(attesterId),
            BigInt(DEFAULT_AIRDROPPED_KARMA),
            BigInt(0),
            BigInt(0),
            false,
        )
        unirepState.addAttestation(proofResults.epochKey, attestationToEpochKey)

        // epoch transition
        let currentEpoch = await unirepContract.currentEpoch()
        const prevEpoch = currentEpoch
        await hardhatEthers.provider.send("evm_increaseTime", [epochLength])  // Fast-forward epochLength of seconds
        tx = await unirepContract.beginEpochTransition()
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        currentEpoch = await unirepContract.currentEpoch()

        // Unirep and user state transition from the first epoch
        const epochTreeLeaves: IEpochTreeLeaf[] = []

        // Generate valid epoch tree leaves
        const attestationSubmittedFilter = unirepContract.filters.AttestationSubmitted(prevEpoch)
        const attestationSubmittedEvents =  await unirepContract.queryFilter(attestationSubmittedFilter)
        const attestationMap = {}
 
        // compute hash chain of valid epoch key
        for (let i = 0; i < attestationSubmittedEvents.length; i++) {
            const proofIndex = attestationSubmittedEvents[i].args?._proofIndex
            const epochKeyProofFilter = unirepContract.filters.EpochKeyProof(proofIndex)
            const epochKeyProofEvent = await unirepContract.queryFilter(epochKeyProofFilter)
            const repProofFilter = unirepContract.filters.ReputationNullifierProof(proofIndex)
            const repProofEvent = await unirepContract.queryFilter(repProofFilter)
            const signUpProofFilter = unirepContract.filters.UserSignedUpProof(proofIndex)
            const signUpProofEvent = await unirepContract.queryFilter(signUpProofFilter)
 
            let isProofValid
            if (epochKeyProofEvent.length == 1){
                console.log('epoch key event')
                const args = epochKeyProofEvent[0]?.args?.epochKeyProofData
                isProofValid = await unirepContract.verifyEpochKeyValidity(
                    args?.globalStateTree,
                    args?.epoch,
                    args?.epochKey,
                    args?.proof,
                )
            } else if (repProofEvent.length == 1){
                console.log('rep nullifier event')
                const args = repProofEvent[0]?.args?.reputationProofData
                isProofValid = await unirepContract.verifyReputation(
                    args?.repNullifiers,
                    args?.epoch,
                    args?.epochKey,
                    args?.globalStateTree,
                    args?.attesterId,
                    args?.proveReputationAmount,
                    args?.minRep,
                    args?.proveGraffiti,
                    args?.graffitiPreImage,
                    args?.proof,
                )
            } else if (signUpProofEvent.length == 1){
                console.log('sign up event')
                const args = signUpProofEvent[0]?.args?.signUpProofData
                isProofValid = await unirepContract.verifyUserSignUp(
                    args?.epoch,
                    args?.epochKey,
                    args?.globalStateTree,
                    args?.attesterId,
                    args?.proof,
                )
            }

            if(isProofValid) {
                const epochKey = attestationSubmittedEvents[i].args?._epochKey
                const _attestation = attestationSubmittedEvents[i].args?.attestation
                if(attestationMap[epochKey] == undefined) {
                    attestationMap[epochKey] = BigInt(0)
                } 
                const attestation = new Attestation(
                    BigInt(_attestation?.attesterId.toString()),
                    BigInt(_attestation?.posRep.toString()),
                    BigInt(_attestation?.negRep.toString()),
                    BigInt(_attestation?.graffiti.toString()),
                    BigInt(_attestation?.signUp.toString()),
                )
                attestationMap[epochKey] = hashLeftRight(
                    attestation.hash(), 
                    attestationMap[epochKey]
                )
            }
        }

        // seal hash chain
        for(let k in attestationMap) {
            attestationMap[k] = hashLeftRight(BigInt(1), attestationMap[k])
            const epochTreeLeaf: IEpochTreeLeaf = {
                epochKey: BigInt(k),
                hashchainResult: attestationMap[k]
            }
            epochTreeLeaves.push(epochTreeLeaf)
        }
        await unirepState.epochTransition(prevEpoch.toNumber(), epochTreeLeaves)
        console.log(`Updating epoch tree leaves off-chain with list of epoch keys: [${epochTreeLeaves.map((l) => l.epochKey.toString())}]`)

        let results = await userState.genUserStateTransitionProofs()
        let isValid = await verifyProof('startTransition', results.startTransitionProof.proof, results.startTransitionProof.publicSignals)
        expect(isValid, 'Verify start transition circuit off-chain failed').to.be.true

        // Verify start transition proof on-chain
        let isProofValid = await unirepSocialContract.verifyStartTransitionProof(
            results.startTransitionProof.blindedUserState,
            results.startTransitionProof.blindedHashChain,
            results.startTransitionProof.globalStateTreeRoot,
            formatProofForVerifierContract(results.startTransitionProof.proof),
        )
        expect(isProofValid, 'Verify start transition circuit on-chain failed').to.be.true

        const blindedUserState = results.startTransitionProof.blindedUserState
        const blindedHashChain = results.startTransitionProof.blindedHashChain
        const GSTreeRoot = results.startTransitionProof.globalStateTreeRoot
        const proof = formatProofForVerifierContract(results.startTransitionProof.proof)

        tx = await unirepContract.startUserStateTransition(
            blindedUserState,
            blindedHashChain,
            GSTreeRoot,
            proof
        )
        receipt = await tx.wait()
        expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
        console.log("Gas cost of submit a start transition proof:", receipt.gasUsed.toString())

        let proofNullifier = await unirepContract.hashStartTransitionProof(
            blindedUserState,
            blindedHashChain,
            GSTreeRoot,
            proof
        )
        let proofIndex = await unirepContract.getProofIndex(proofNullifier)
        proofIndexes.push(BigInt(proofIndex))

        for (let i = 0; i < results.processAttestationProofs.length; i++) {
            const isValid = await verifyProof('processAttestations', results.processAttestationProofs[i].proof, results.processAttestationProofs[i].publicSignals)
            expect(isValid, 'Verify process attestations circuit off-chain failed').to.be.true

            const outputBlindedUserState = results.processAttestationProofs[i].outputBlindedUserState
            const outputBlindedHashChain = results.processAttestationProofs[i].outputBlindedHashChain
            const inputBlindedUserState = results.processAttestationProofs[i].inputBlindedUserState

            // Verify processAttestations proof on-chain
            const isProofValid = await unirepSocialContract.verifyProcessAttestationProof(
                outputBlindedUserState,
                outputBlindedHashChain,
                inputBlindedUserState,
                formatProofForVerifierContract(results.processAttestationProofs[i].proof),
            )
            expect(isProofValid, 'Verify process attestations circuit on-chain failed').to.be.true

            const tx = await unirepSocialContract.processAttestations(
                outputBlindedUserState,
                outputBlindedHashChain,
                inputBlindedUserState,
                formatProofForVerifierContract(results.processAttestationProofs[i].proof),
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit process attestations proof failed').to.equal(1)
            console.log("Gas cost of submit a process attestations proof:", receipt.gasUsed.toString())

            const proofNullifier = await unirepContract.hashProcessAttestationsProof(
                outputBlindedUserState,
                outputBlindedHashChain,
                inputBlindedUserState,
                formatProofForVerifierContract(results.processAttestationProofs[i].proof),
            )
            const proofIndex = await unirepContract.getProofIndex(proofNullifier)
            proofIndexes.push(BigInt(proofIndex))
        }

        isValid = await verifyProof('userStateTransition', results.finalTransitionProof.proof, results.finalTransitionProof.publicSignals)
        expect(isValid, 'Verify user state transition circuit off-chain failed').to.be.true

        const newGSTLeaf = results.finalTransitionProof.newGlobalStateTreeLeaf
        const outputEpkNullifiers = results.finalTransitionProof.epochKeyNullifiers
        const blindedUserStates = results.finalTransitionProof.blindedUserStates
        const blindedHashChains = results.finalTransitionProof.blindedHashChains
        const fromEpoch = results.finalTransitionProof.transitionedFromEpoch
        // const GSTreeRoot = results.finalTransitionProof.fromGSTRoot
        const epochTreeRoot = results.finalTransitionProof.fromEpochTree

        // Verify userStateTransition proof on-chain
        isProofValid = await unirepSocialContract.verifyUserStateTransition(
            newGSTLeaf,
            outputEpkNullifiers,
            fromEpoch,
            blindedUserStates,
            GSTreeRoot,
            blindedHashChains,
            epochTreeRoot,
            formatProofForVerifierContract(results.finalTransitionProof.proof),
        )
        expect(isProofValid, 'Verify user state transition circuit on-chain failed').to.be.true
        
        const userStateTransitionData = [
            newGSTLeaf,
            outputEpkNullifiers,
            fromEpoch,
            blindedUserStates,
            GSTreeRoot,
            blindedHashChains,
            epochTreeRoot,
            formatProofForVerifierContract(results.finalTransitionProof.proof),
        ]

        tx = await unirepSocialContract.updateUserStateRoot(
            userStateTransitionData,
            proofIndexes
        )
        receipt = await tx.wait()
        expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
        console.log("Gas cost of submit a user state transition proof:", receipt.gasUsed.toString())
        numLeaf ++

        const newState = await userState.genNewUserStateAfterTransition()
        const epkNullifiers = userState.getEpochKeyNullifiers(1)
        const epoch_ = await unirepContract.currentEpoch()
        expect(newGSTLeaf, 'Computed new GST leaf should match').to.equal(newState.newGSTLeaf.toString())
        userState.transition(newState.newUSTLeaves)
        unirepState.userStateTransition(epoch_, BigInt(newGSTLeaf), epkNullifiers)
        
        // generate reputation proof should success
        const proveGraffiti = 0
        const minPosRep = 30, graffitiPreImage = 0
        results = await userState.genProveReputationProof(BigInt(attesterId), repNullifiersAmount, epkNonce, minPosRep, proveGraffiti, graffitiPreImage)
        isValid = await verifyProof('proveReputation', results.proof, results.publicSignals)
        expect(isValid, 'Verify reputation proof off-chain failed').to.be.true
    })

    it('user signs up through a signed up attester with 0 airdrop should not get airdrop', async() => {
        console.log('User sign up')
        const userId = genIdentity()
        const userCommitment = genIdentityCommitment(userId)
        let tx = await unirepContractCalledByAttester.userSignUp(userCommitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const newGSTLeafInsertedFilter = unirepContract.filters.NewGSTLeafInserted()
        const newGSTLeafInsertedEvents =  await unirepContract.queryFilter(newGSTLeafInsertedFilter)
        const newGSTLeaf = newGSTLeafInsertedEvents[numLeaf].args._hashedLeaf
        numLeaf ++

        // expected airdropped user state
        const defaultLeafHash = hash5([])
        const tree = await genNewSMT(circuitUserStateTreeDepth, defaultLeafHash)
        const SMTRoot = await tree.getRootHash()
        const hashedLeaf = hashLeftRight(userCommitment, SMTRoot)
        expect(newGSTLeaf).equal(hashedLeaf)

        // prove reputation should fail
        const currentEpoch = await unirepContract.currentEpoch()
        unirepState.signUp(currentEpoch.toNumber(), BigInt(newGSTLeaf))
        userState = new UserState(
            unirepState,
            userId,
            userCommitment,
            false,
        )
        const latestTransitionedToEpoch = currentEpoch.toNumber()
        const GSTreeLeafIndex = 1
        const airdropAmount = 0
        userState.signUp(latestTransitionedToEpoch, GSTreeLeafIndex, attesterId, airdropAmount)
        const proveGraffiti = 0
        const minPosRep = 19, graffitiPreImage = 0
        const results = await userState.genProveReputationProof(BigInt(attesterId), repNullifiersAmount, epkNonce, minPosRep, proveGraffiti, graffitiPreImage)
        const isValid = await verifyProof('proveReputation', results.proof, results.publicSignals)
        expect(isValid, 'Verify reputation proof off-chain failed').to.be.false
    })

    it('user signs up through a non-signed up attester should succeed and gets no airdrop', async() => {
        console.log('User sign up')
        const userId = genIdentity()
        const userCommitment = genIdentityCommitment(userId)
        let tx = await unirepContractCalledByAttester.userSignUp(userCommitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const newGSTLeafInsertedFilter = unirepContract.filters.NewGSTLeafInserted()
        const newGSTLeafInsertedEvents =  await unirepContract.queryFilter(newGSTLeafInsertedFilter)
        const newGSTLeaf = newGSTLeafInsertedEvents[numLeaf].args._hashedLeaf
        numLeaf ++

        // expected airdropped user state
        const defaultLeafHash = hash5([])
        const tree = await genNewSMT(circuitUserStateTreeDepth, defaultLeafHash)
        const SMTRoot = await tree.getRootHash()
        const hashedLeaf = hashLeftRight(userCommitment, SMTRoot)
        expect(newGSTLeaf).equal(hashedLeaf)
    })
})