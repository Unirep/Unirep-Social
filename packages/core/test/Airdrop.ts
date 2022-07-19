// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { expect } from 'chai'
import { BigNumber, ethers } from 'ethers'
import { ZkIdentity } from '@unirep/crypto'
import { deployUnirep } from '@unirep/contracts'
import { genUserState } from './utils'
import * as config from '@unirep/circuits'
import { UserState } from '@unirep/core'

import { getTreeDepthsForTesting } from './utils'
import { deployUnirepSocial, UnirepSocial } from '../src/utils'
import { defaultAirdroppedReputation } from '../config/socialMedia'

describe('Airdrop', function () {
    this.timeout(100000)

    let unirepContract, unirepSocialContract: UnirepSocial
    let userState: UserState
    const iden = new ZkIdentity()
    const userCommitment = iden.genIdentityCommitment()

    let accounts: ethers.Signer[]
    let attester, attesterId, unirepContractCalledByAttester
    let airdropAmount

    const epkNonce = 0
    const proofIndexes: BigNumber[] = []
    let duplicatedProof
    const attestingFee = ethers.utils.parseEther('0.1')

    before(async () => {
        accounts = await hardhatEthers.getSigners()
        const _treeDepths = getTreeDepthsForTesting('circuit')
        const _settings = {
            maxUsers: config.MAX_USERS,
            maxAttesters: config.MAX_ATTESTERS,
            numEpochKeyNoncePerEpoch: config.NUM_EPOCH_KEY_NONCE_PER_EPOCH,
            maxReputationBudget: config.MAX_REPUTATION_BUDGET,
            epochLength: config.EPOCH_LENGTH,
            attestingFee: attestingFee,
        }
        unirepContract = await deployUnirep(
            <ethers.Wallet>accounts[0],
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

        attesterId = BigInt(
            await unirepContract.attesters(unirepSocialContract.address)
        )
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

        userState = await genUserState(
            hardhatEthers.provider,
            unirepContract.address,
            iden
        )
        const reputationProof = await userState.genProveReputationProof(
            attesterId,
            epkNonce,
            defaultAirdroppedReputation
        )
        const isValid = await reputationProof.verify()
        expect(isValid, 'Verify reputation proof off-chain failed').to.be.true
    })

    it('user can get airdrop positive reputation through calling airdrop function in Unirep Social', async () => {
        const signUpProof = await userState.genUserSignUpProof(attesterId)
        duplicatedProof = signUpProof

        const isSignUpProofValid = await signUpProof.verify()
        expect(isSignUpProofValid, 'Sign up proof is not valid').to.be.true

        // submit epoch key
        let tx = await unirepSocialContract.airdrop(
            signUpProof.publicSignals,
            signUpProof.proof,
            {
                value: attestingFee,
            }
        )
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)
    })

    it('submit a duplicated airdrop proof should fail', async () => {
        await expect(
            unirepSocialContract.airdrop(
                duplicatedProof.publicSignals,
                duplicatedProof.proof,
                {
                    value: attestingFee,
                }
            )
        ).to.be.revertedWith('Unirep Social: the epoch key has been airdropped')
    })

    it('submit an epoch key twice should fail (different proof)', async () => {
        const signUpProof = await userState.genUserSignUpProof(attesterId)
        expect(signUpProof.proof[0]).not.equal(duplicatedProof.proof[0])
        await expect(
            unirepSocialContract.airdrop(
                signUpProof.publicSignals,
                signUpProof.proof,
                { value: attestingFee }
            )
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

        userState = await genUserState(
            hardhatEthers.provider,
            unirepContract.address,
            iden
        )
        const {
            startTransitionProof,
            processAttestationProofs,
            finalTransitionProof,
        } = await userState.genUserStateTransitionProofs()

        expect(
            await startTransitionProof.verify(),
            'Verify start transition circuit off-chain failed'
        ).to.be.true

        // Verify start transition proof on-chain
        {
            const isProofValid =
                await unirepContract.verifyStartTransitionProof(
                    startTransitionProof.publicSignals,
                    startTransitionProof.proof
                )
            expect(
                isProofValid,
                'Verify start transition circuit on-chain failed'
            ).to.be.true
        }

        {
            const receipt = await unirepContract
                .startUserStateTransition(
                    startTransitionProof.publicSignals,
                    startTransitionProof.proof
                )
                .then((t) => t.wait())
            expect(
                receipt.status,
                'Submit user state transition proof failed'
            ).to.equal(1)
            console.log(
                'Gas cost of submit a start transition proof:',
                receipt.gasUsed.toString()
            )
        }

        const proofNullifier = startTransitionProof.hash()
        const proofIndex = await unirepContract.getProofIndex(proofNullifier)
        proofIndexes.push(BigNumber.from(proofIndex))

        for (let i = 0; i < processAttestationProofs.length; i++) {
            const isValid = await processAttestationProofs[i].verify()
            expect(
                isValid,
                'Verify process attestations circuit off-chain failed'
            ).to.be.true

            // Verify processAttestations proof on-chain
            const isProofValid =
                await unirepContract.verifyProcessAttestationProof(
                    processAttestationProofs[i].publicSignals,
                    processAttestationProofs[i].proof
                )
            expect(
                isProofValid,
                'Verify process attestations circuit on-chain failed'
            ).to.be.true

            const tx = await unirepSocialContract.processAttestations(
                processAttestationProofs[i].publicSignals,
                processAttestationProofs[i].proof
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

            const proofNullifier = processAttestationProofs[i].hash()
            const proofIndex = await unirepContract.getProofIndex(
                proofNullifier
            )
            proofIndexes.push(BigNumber.from(proofIndex))
        }

        expect(
            await finalTransitionProof.verify(),
            'Verify user state transition circuit off-chain failed'
        ).to.be.true

        // Verify userStateTransition proof on-chain
        {
            const isProofValid = await unirepContract.verifyUserStateTransition(
                finalTransitionProof.publicSignals,
                finalTransitionProof.proof
            )
            expect(
                isProofValid,
                'Verify user state transition circuit on-chain failed'
            ).to.be.true
        }

        {
            const receipt = await unirepSocialContract
                .updateUserStateRoot(
                    finalTransitionProof.publicSignals,
                    finalTransitionProof.proof,
                    proofIndexes
                )
                .then((t) => t.wait())
            expect(
                receipt.status,
                'Submit user state transition proof failed'
            ).to.equal(1)
            console.log(
                'Gas cost of submit a user state transition proof:',
                receipt.gasUsed.toString()
            )
        }
        await userState.waitForSync()

        // generate reputation proof should success
        const proveGraffiti = BigInt(0)
        const minPosRep = 30,
            graffitiPreImage = BigInt(0)
        const reputationProof = await userState.genProveReputationProof(
            attesterId,
            epkNonce,
            minPosRep,
            proveGraffiti,
            graffitiPreImage
        )
        expect(
            await reputationProof.verify(),
            'Verify reputation proof off-chain failed'
        ).to.be.true
    })

    it('user signs up through a signed up attester with 0 airdrop should not get airdrop', async () => {
        console.log('User sign up')
        const userId2 = new ZkIdentity()
        const userCommitment2 = userId2.genIdentityCommitment()
        const tx = await unirepContractCalledByAttester.userSignUp(
            userCommitment2
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const userState2 = await genUserState(
            hardhatEthers.provider,
            unirepContract.address,
            userId2
        )
        const reputationProof = await userState2.genProveReputationProof(
            attesterId,
            epkNonce,
            defaultAirdroppedReputation
        )
        const isValid = await reputationProof.verify()
        expect(isValid, 'Verify reputation proof off-chain should fail').to.be
            .false
    })

    it('user signs up through a non-signed up attester should succeed and gets no airdrop', async () => {
        console.log('User sign up')
        const userId3 = new ZkIdentity()
        const userCommitment3 = userId3.genIdentityCommitment()
        const tx = await unirepContractCalledByAttester.userSignUp(
            userCommitment3
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const userState3 = await genUserState(
            hardhatEthers.provider,
            unirepContract.address,
            userId3
        )
        const minRep = 1
        const reputationProof = await userState3.genProveReputationProof(
            attesterId,
            epkNonce,
            minRep
        )
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
