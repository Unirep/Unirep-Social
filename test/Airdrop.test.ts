// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { expect } from 'chai'
import { BigNumber, ethers } from 'ethers'
import { config, circuits, contracts, core, crypto } from 'unirep'

import {
    getTreeDepthsForTesting,
    SignUpProof,
    ReputationProof,
    UserTransitionProof,
} from './utils'
import { deployUnirepSocial, UnirepSocial } from '../core/utils'
import { defaultAirdroppedReputation } from '../config/socialMedia'

describe('Airdrop', function () {
    this.timeout(100000)

    let unirepContract: contracts.Unirep
    let unirepSocialContract: UnirepSocial
    let userState: core.UserState
    const userId = new crypto.ZkIdentity()
    const userCommitment = userId.genIdentityCommitment()

    let accounts: ethers.Signer[]
    let attester, attesterId, unirepContractCalledByAttester
    let airdropAmount

    const epkNonce = 0
    const proofIndexes: BigNumber[] = []
    let duplicatedProof
    const attestingFee = ethers.utils.parseEther('0.1')

    before(async () => {
        accounts = await hardhatEthers.getSigners()
        const _treeDepths = getTreeDepthsForTesting()
        const _settings = {
            maxUsers: config.MAX_USERS,
            maxAttesters: config.MAX_ATTESTERS,
            numEpochKeyNoncePerEpoch: config.NUM_EPOCH_KEY_NONCE_PER_EPOCH,
            maxReputationBudget: config.MAX_REPUTATION_BUDGET,
            epochLength: config.EPOCH_LENGTH,
            attestingFee: attestingFee,
        }
        unirepContract = await contracts.deployUnirep(
            <ethers.Wallet>accounts[0],
            _treeDepths,
            _settings
        )
        unirepSocialContract = await deployUnirepSocial(
            <ethers.Wallet>accounts[0],
            unirepContract.address
        )
    })

    it('attester signs up and attester sets airdrop amount should succeed', async () => {
        console.log('Attesters sign up')
        attester = accounts[1]
        unirepContractCalledByAttester = unirepContract.connect(attester)
        let tx = await unirepContractCalledByAttester.attesterSignUp()
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)
        attesterId = (
            await unirepContract.attesters(unirepSocialContract.address)
        ).toBigInt()
        expect(attesterId).not.equal(0)
        airdropAmount = await unirepContract.airdropAmount(
            unirepSocialContract.address
        )
        expect(airdropAmount).equal(defaultAirdroppedReputation)
    })

    it('user signs up through unirep social should get airdrop pos rep', async () => {
        console.log('User sign up')
        let tx = await unirepSocialContract.userSignUp(
            BigNumber.from(userCommitment)
        )
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        userState = await core.genUserStateFromContract(
            hardhatEthers.provider,
            unirepContract.address,
            userId
        )
        const { proof, publicSignals } =
            await userState.genProveReputationProof(
                attesterId,
                epkNonce,
                defaultAirdroppedReputation
            )
        const reputationProof = new ReputationProof(publicSignals, proof)
        const isValid = await reputationProof.verify()
        expect(isValid, 'Verify reputation proof off-chain failed').to.be.true
    })

    it('user can get airdrop positive reputation through calling airdrop function in Unirep Social', async () => {
        const { proof, publicSignals } = await userState.genUserSignUpProof(
            attesterId
        )
        const signUpProof = new SignUpProof(publicSignals, proof)
        duplicatedProof = signUpProof

        const isSignUpProofValid = await signUpProof.verify()
        expect(isSignUpProofValid, 'Sign up proof is not valid').to.be.true

        // submit epoch key
        let tx = await unirepSocialContract.airdrop(signUpProof, {
            value: attestingFee,
        })
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)
    })

    it('submit a duplicated airdrop proof should fail', async () => {
        await expect(
            unirepSocialContract.airdrop(duplicatedProof, {
                value: attestingFee,
            })
        ).to.be.revertedWith('Unirep Social: the epoch key has been airdropped')
    })

    it('submit an epoch key twice should fail (different proof)', async () => {
        const { proof, publicSignals } = await userState.genUserSignUpProof(
            attesterId
        )
        const signUpProof = new SignUpProof(publicSignals, proof)
        expect(signUpProof.proof[0]).not.equal(duplicatedProof.proof[0])
        await expect(
            unirepSocialContract.airdrop(signUpProof, { value: attestingFee })
        ).to.be.revertedWith('Unirep Social: the epoch key has been airdropped')
    })

    it('user can receive airdrop after user state transition', async () => {
        // epoch transition
        await hardhatEthers.provider.send('evm_increaseTime', [
            config.EPOCH_LENGTH,
        ]) // Fast-forward epochLength of seconds
        let tx = await unirepContract.beginEpochTransition()
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        userState = await core.genUserStateFromContract(
            hardhatEthers.provider,
            unirepContract.address,
            userId
        )
        const {
            startTransitionProof,
            processAttestationProofs,
            finalTransitionProof,
        } = await userState.genUserStateTransitionProofs()

        let isValid = await circuits.verifyProof(
            circuits.Circuit.startTransition,
            startTransitionProof.proof,
            startTransitionProof.publicSignals
        )
        expect(isValid, 'Verify start transition circuit off-chain failed').to
            .be.true

        // Verify start transition proof on-chain
        let isProofValid = await unirepContract.verifyStartTransitionProof(
            startTransitionProof.blindedUserState,
            startTransitionProof.blindedHashChain,
            startTransitionProof.globalStateTreeRoot,
            circuits.formatProofForVerifierContract(startTransitionProof.proof)
        )
        expect(isProofValid, 'Verify start transition circuit on-chain failed')
            .to.be.true

        const blindedUserState = startTransitionProof.blindedUserState
        const blindedHashChain = startTransitionProof.blindedHashChain
        const GSTreeRoot = startTransitionProof.globalStateTreeRoot
        const _proof = circuits.formatProofForVerifierContract(
            startTransitionProof.proof
        )

        tx = await unirepContract.startUserStateTransition(
            blindedUserState,
            blindedHashChain,
            GSTreeRoot,
            _proof
        )
        receipt = await tx.wait()
        expect(
            receipt.status,
            'Submit user state transition proof failed'
        ).to.equal(1)
        console.log(
            'Gas cost of submit a start transition proof:',
            receipt.gasUsed.toString()
        )

        let proofNullifier = contracts.computeStartTransitionProofHash(
            blindedUserState,
            blindedHashChain,
            GSTreeRoot,
            _proof
        )
        let proofIndex = await unirepContract.getProofIndex(proofNullifier)
        proofIndexes.push(BigNumber.from(proofIndex))

        for (let i = 0; i < processAttestationProofs.length; i++) {
            const isValid = await circuits.verifyProof(
                circuits.Circuit.processAttestations,
                processAttestationProofs[i].proof,
                processAttestationProofs[i].publicSignals
            )
            expect(
                isValid,
                'Verify process attestations circuit off-chain failed'
            ).to.be.true

            const outputBlindedUserState =
                processAttestationProofs[i].outputBlindedUserState
            const outputBlindedHashChain =
                processAttestationProofs[i].outputBlindedHashChain
            const inputBlindedUserState =
                processAttestationProofs[i].inputBlindedUserState

            // Verify processAttestations proof on-chain
            const isProofValid =
                await unirepContract.verifyProcessAttestationProof(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    circuits.formatProofForVerifierContract(
                        processAttestationProofs[i].proof
                    )
                )
            expect(
                isProofValid,
                'Verify process attestations circuit on-chain failed'
            ).to.be.true

            const tx = await unirepSocialContract.processAttestations(
                outputBlindedUserState,
                outputBlindedHashChain,
                inputBlindedUserState,
                circuits.formatProofForVerifierContract(
                    processAttestationProofs[i].proof
                )
            )
            const receipt = await tx.wait()
            expect(
                receipt.status,
                'Submit process attestations proof failed'
            ).to.equal(1)
            console.log(
                'Gas cost of submit a process attestations proof:',
                receipt.gasUsed.toString()
            )

            const proofNullifier =
                contracts.computeProcessAttestationsProofHash(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    circuits.formatProofForVerifierContract(
                        processAttestationProofs[i].proof
                    )
                )
            const proofIndex = await unirepContract.getProofIndex(
                proofNullifier
            )
            proofIndexes.push(BigNumber.from(proofIndex))
        }

        const USTProof = new UserTransitionProof(
            finalTransitionProof.publicSignals,
            finalTransitionProof.proof
        )
        isValid = await USTProof.verify()
        expect(isValid, 'Verify user state transition circuit off-chain failed')
            .to.be.true

        // Verify userStateTransition proof on-chain
        isProofValid = await unirepContract.verifyUserStateTransition(USTProof)
        expect(
            isProofValid,
            'Verify user state transition circuit on-chain failed'
        ).to.be.true

        tx = await unirepSocialContract.updateUserStateRoot(
            USTProof,
            proofIndexes
        )
        receipt = await tx.wait()
        expect(
            receipt.status,
            'Submit user state transition proof failed'
        ).to.equal(1)
        console.log(
            'Gas cost of submit a user state transition proof:',
            receipt.gasUsed.toString()
        )

        // generate reputation proof should success
        const proveGraffiti = BigInt(0)
        const minPosRep = 30,
            graffitiPreImage = BigInt(0)
        const { publicSignals, proof } =
            await userState.genProveReputationProof(
                attesterId,
                epkNonce,
                minPosRep,
                proveGraffiti,
                graffitiPreImage
            )
        const reputationProof = new ReputationProof(publicSignals, proof)
        isValid = await reputationProof.verify()
        expect(isValid, 'Verify reputation proof off-chain failed').to.be.true
    })

    it('user signs up through a signed up attester with 0 airdrop should not get airdrop', async () => {
        console.log('User sign up')
        const userId2 = new crypto.ZkIdentity()
        const userCommitment2 = userId2.genIdentityCommitment()
        let tx = await unirepContractCalledByAttester.userSignUp(
            userCommitment2
        )
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const userState2 = await core.genUserStateFromContract(
            hardhatEthers.provider,
            unirepContract.address,
            userId2
        )
        const { proof, publicSignals } =
            await userState2.genProveReputationProof(
                attesterId,
                epkNonce,
                defaultAirdroppedReputation
            )
        const reputationProof = new ReputationProof(publicSignals, proof)
        const isValid = await reputationProof.verify()
        expect(isValid, 'Verify reputation proof off-chain should fail').to.be
            .false
    })

    it('user signs up through a non-signed up attester should succeed and gets no airdrop', async () => {
        console.log('User sign up')
        const userId3 = new crypto.ZkIdentity()
        const userCommitment3 = userId3.genIdentityCommitment()
        let tx = await unirepContractCalledByAttester.userSignUp(
            userCommitment3
        )
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const userState3 = await core.genUserStateFromContract(
            hardhatEthers.provider,
            unirepContract.address,
            userId3
        )
        const minRep = 1
        const { proof, publicSignals } =
            await userState3.genProveReputationProof(
                attesterId,
                epkNonce,
                minRep
            )
        const reputationProof = new ReputationProof(publicSignals, proof)
        const isValid = await reputationProof.verify()
        expect(isValid, 'Verify reputation proof off-chain should fail').to.be
            .false
    })

    it('query airdrop event', async () => {
        const airdropFilter = unirepSocialContract.filters.AirdropSubmitted()
        const airdropEvents = await unirepSocialContract.queryFilter(
            airdropFilter
        )
        expect(airdropEvents).not.equal(0)
    })
})
