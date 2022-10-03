// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt, ZkIdentity } from '@unirep/crypto'
import { getUnirepContract, Attestation } from '@unirep/contracts'
import { deployUnirep } from '@unirep/contracts/deploy'
import * as config from '@unirep/circuits'
import { genEpochKey } from '@unirep/core'
import { genUserState } from './utils'

import { deployUnirepSocial, UnirepSocial } from '../src/utils'

describe('Epoch Transition', function () {
    this.timeout(1000000)

    let unirepContract: ethers.Contract
    let unirepSocialContract: UnirepSocial
    let accounts: ethers.Signer[]

    let userId, userCommitment

    let attester, attesterAddress, attesterId, unirepContractCalledByAttester

    const signedUpInLeaf = 1
    const attestingFee = ethers.utils.parseEther('0.1') // to avoid VM Exception: 'Address: insufficient balance'

    const EPOCH_LENGTH = 10000

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _settings = {
            maxUsers: config.MAX_USERS,
            maxAttesters: config.MAX_ATTESTERS,
            numEpochKeyNoncePerEpoch: config.NUM_EPOCH_KEY_NONCE_PER_EPOCH,
            maxReputationBudget: config.MAX_REPUTATION_BUDGET,
            epochLength: EPOCH_LENGTH,
            attestingFee: attestingFee,
        }
        unirepContract = (await deployUnirep(
            <ethers.Wallet>accounts[0],
            _settings
        )) as any
        unirepSocialContract = await deployUnirepSocial(
            <ethers.Wallet>accounts[0],
            unirepContract.address
        )

        console.log('User sign up')
        userId = new ZkIdentity()
        userCommitment = userId.genIdentityCommitment()
        let tx = await unirepSocialContract.userSignUp(userCommitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        console.log('Attester sign up')
        attester = accounts[1]
        attesterAddress = await attester.getAddress()
        unirepContractCalledByAttester = getUnirepContract(
            unirepContract.address,
            attester
        )
        tx = await unirepContractCalledByAttester.attesterSignUp()
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        attesterId = await unirepContract.attesters(attesterAddress)

        // Submit attestations
        let epoch = await unirepContract.currentEpoch()
        let nonce = 1
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)

        // Submit attestations
        const attestationNum = 2
        for (let i = 0; i < attestationNum; i++) {
            let attestation = new Attestation(
                BigInt(attesterId.toString()),
                BigInt(i),
                BigInt(0),
                genRandomSalt(),
                BigInt(signedUpInLeaf)
            )
            tx = await unirepContractCalledByAttester.submitAttestation(
                attestation,
                epochKey,
                { value: attestingFee }
            )
            receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }

        nonce = 2
        epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)

        for (let i = 0; i < attestationNum; i++) {
            let attestation = new Attestation(
                BigInt(attesterId.toString()),
                BigInt(i),
                BigInt(0),
                genRandomSalt(),
                BigInt(signedUpInLeaf)
            )
            tx = await unirepContractCalledByAttester.submitAttestation(
                attestation,
                epochKey,
                { value: attestingFee }
            )
            receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }

        nonce = 0
        epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)

        for (let i = 0; i < attestationNum; i++) {
            let attestation = new Attestation(
                BigInt(attesterId.toString()),
                BigInt(i),
                BigInt(0),
                genRandomSalt(),
                BigInt(signedUpInLeaf)
            )
            tx = await unirepContractCalledByAttester.submitAttestation(
                attestation,
                epochKey,
                { value: attestingFee }
            )
            receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }
    })

    it('premature epoch transition should fail', async () => {
        await expect(
            unirepContract.beginEpochTransition()
        ).to.be.revertedWithCustomError(unirepContract, 'EpochNotEndYet')
    })

    it('epoch transition should succeed', async () => {
        // Record data before epoch transition so as to compare them with data after epoch transition
        let epoch = await unirepContract.currentEpoch()

        // Fast-forward epochLength of seconds
        await hardhatEthers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        // Assert no epoch transition compensation is dispensed to volunteer
        expect(
            await unirepContract.epochTransitionCompensation(attesterAddress)
        ).to.be.equal(0)
        // Begin epoch transition
        let tx = await unirepContractCalledByAttester.beginEpochTransition()
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)
        console.log(
            'Gas cost of sealing one epoch key:',
            receipt.gasUsed.toString()
        )
        // Verify compensation to the volunteer increased
        expect(
            await unirepContract.epochTransitionCompensation(attesterAddress)
        ).to.gt(0)

        // Complete epoch transition
        expect(await unirepContract.currentEpoch()).to.be.equal(epoch.add(1))

        // Verify latestEpochTransitionTime and currentEpoch
        let latestEpochTransitionTime =
            await unirepContract.latestEpochTransitionTime()
        expect(latestEpochTransitionTime).equal(
            (await hardhatEthers.provider.getBlock(receipt.blockNumber))
                .timestamp
        )

        let epoch_ = await unirepContract.currentEpoch()
        expect(epoch_).equal(epoch.add(1))
    })

    it('start user state transition should succeed', async () => {
        const userState = await genUserState(
            hardhatEthers.provider,
            unirepContract.address,
            userId
        )
        const {
            startTransitionProof,
            processAttestationProofs,
            finalTransitionProof,
        } = await userState.genUserStateTransitionProofs()
        let isValid = await startTransitionProof.verify()
        expect(isValid, 'Verify start transition circuit off-chain failed').to
            .be.true

        // Verify start transition proof on-chain
        isValid = await unirepContract.verifyStartTransitionProof(
            startTransitionProof.publicSignals,
            startTransitionProof.proof
        )
        expect(isValid, 'Verify start transition circuit on-chain failed').to.be
            .true

        let tx = await unirepSocialContract.startUserStateTransition(
            startTransitionProof.publicSignals,
            startTransitionProof.proof
        )
        let receipt = await tx.wait()
        expect(
            receipt.status,
            'Submit user state transition proof failed'
        ).to.equal(1)
        console.log(
            'Gas cost of submit a start transition proof:',
            receipt.gasUsed.toString()
        )

        for (let i = 0; i < processAttestationProofs.length; i++) {
            expect(
                await processAttestationProofs[i].verify(),
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
        }

        isValid = await finalTransitionProof.verify()
        expect(isValid, 'Verify user state transition circuit off-chain failed')
            .to.be.true

        // Verify userStateTransition proof on-chain
        const isProofValid = await unirepContract.verifyUserStateTransition(
            finalTransitionProof.publicSignals,
            finalTransitionProof.proof
        )
        expect(
            isProofValid,
            'Verify user state transition circuit on-chain failed'
        ).to.be.true

        tx = await unirepContract.updateUserStateRoot(
            finalTransitionProof.publicSignals,
            finalTransitionProof.proof
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
    })

    it('user should successfully tranistion to the latest epoch', async () => {
        const currentEpoch = await unirepContract.currentEpoch()
        const userState = await genUserState(
            hardhatEthers.provider,
            unirepContract.address,
            userId
        )
        expect(await userState.latestTransitionedEpoch()).equal(
            Number(currentEpoch)
        )
    })

    it('epoch transition with no attestations and epoch keys should also succeed', async () => {
        let epoch = await unirepContract.currentEpoch()

        // Fast-forward epochLength of seconds
        await hardhatEthers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        // Begin epoch transition
        let tx = await unirepContract.beginEpochTransition()
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // Verify latestEpochTransitionTime and currentEpoch
        let latestEpochTransitionTime =
            await unirepContract.latestEpochTransitionTime()
        expect(latestEpochTransitionTime).equal(
            (await hardhatEthers.provider.getBlock(receipt.blockNumber))
                .timestamp
        )

        let epoch_ = await unirepContract.currentEpoch()
        expect(epoch_).equal(epoch.add(1))
    })
})
