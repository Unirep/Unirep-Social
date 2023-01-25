// @ts-ignore
import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { expect } from 'chai'
import * as config from '@unirep/circuits'
import * as ContractConfig from '@unirep/contracts'
import { deployUnirep } from '@unirep/contracts/deploy'
import { ZkIdentity, hashOne } from '@unirep/crypto'

import { genUserState } from './utils'
import { maxReputationBudget } from '../config/socialMedia'
import { deployUnirepSocial, UnirepSocial } from '../src/utils'
import { EPOCH_LENGTH } from '@unirep/contracts'

const DEFAULT_ATTESTING_FEE = BigNumber.from(1)

describe('Username', function () {
    this.timeout(300000)

    let unirepContract
    let unirepSocialContract: UnirepSocial

    before(async () => {
        const accounts = await ethers.getSigners()

        const _settings = {
            numEpochKeyNoncePerEpoch: config.NUM_EPOCH_KEY_NONCE_PER_EPOCH,
            maxReputationBudget: maxReputationBudget,
            epochLength: ContractConfig.EPOCH_LENGTH,
            attestingFee: DEFAULT_ATTESTING_FEE,
        }
        unirepContract = await deployUnirep(accounts[0], _settings)
        unirepSocialContract = await deployUnirepSocial(
            accounts[0],
            unirepContract.address,
            {
                airdropReputation: 30,
            }
        )
    })

    it('set a username should succeed', async () => {
        const attesterId = BigInt(
            await unirepContract.attesters(unirepSocialContract.address)
        )
        const id = new ZkIdentity()
        await unirepSocialContract
            .userSignUp(id.genIdentityCommitment())
            .then((t) => t.wait())
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id
        )
        const epkNonce = 0
        const reputationProof = await userState.genProveReputationProof(
            attesterId,
            epkNonce
        )
        const oldUsername = 0
        const username = 'username1'
        const username16 = ethers.utils.hexlify(
            ethers.utils.toUtf8Bytes(username)
        )
        const hashedUsername = hashOne(username16)
        await unirepSocialContract
            .setUsername(
                reputationProof.epochKey,
                oldUsername,
                hashedUsername,
                { value: DEFAULT_ATTESTING_FEE }
            )
            .then((t) => t.wait())
    })

    it('set a username and receive an attestation should succeed UST', async () => {
        const attesterId = BigInt(
            await unirepContract.attesters(unirepSocialContract.address)
        )
        const id = new ZkIdentity()
        await unirepSocialContract
            .userSignUp(id.genIdentityCommitment())
            .then((t) => t.wait())
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id
        )
        const epkNonce = 0
        const { epochKey } = await userState.genProveReputationProof(
            attesterId,
            epkNonce
        )
        const oldUsername = 0
        const username10 = 'username2'
        const username16 = ethers.utils.hexlify(
            ethers.utils.toUtf8Bytes(username10)
        )
        const username = hashOne(username16)
        await unirepSocialContract
            .setUsername(epochKey, oldUsername, username, {
                value: DEFAULT_ATTESTING_FEE,
            })
            .then((t) => t.wait())

        // vote the user
        {
            const id = new ZkIdentity()
            await unirepSocialContract
                .userSignUp(id.genIdentityCommitment())
                .then((t) => t.wait())
            const userState2 = await genUserState(
                ethers.provider,
                unirepContract.address,
                id
            )
            const proveGraffiti = BigInt(0)
            const minPosRep = 0
            const graffitiPreImage = BigInt(0)
            const epkNonce = 0
            const upvoteValue = 3
            const reputationProof = await userState2.genProveReputationProof(
                attesterId,
                epkNonce,
                minPosRep,
                proveGraffiti,
                graffitiPreImage,
                upvoteValue
            )
            await unirepSocialContract
                .vote(
                    upvoteValue,
                    0,
                    epochKey,
                    reputationProof.publicSignals,
                    reputationProof.proof,
                    { value: DEFAULT_ATTESTING_FEE.mul(2) }
                )
                .then((t) => t.wait())
            await userState2.stop()
        }

        // epoch transition
        {
            await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
            let tx = await unirepContract.beginEpochTransition()
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }

        // user1 user state transition
        await userState.waitForSync()
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

        // user1 should prove username
        await userState.waitForSync()
        const reputationProof = await userState.genProveReputationProof(
            attesterId,
            epkNonce,
            undefined,
            BigInt(1),
            username16
        )
        expect(await reputationProof.verify()).to.be.true
    })

    it('should be able to use unused username', async () => {
        // sign up a new user
        const attesterId = BigInt(
            await unirepContract.attesters(unirepSocialContract.address)
        )
        const id = new ZkIdentity()
        await unirepSocialContract
            .userSignUp(id.genIdentityCommitment())
            .then((t) => t.wait())
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id
        )

        // set username1
        const epkNonce = 0
        const { epochKey: epochKey1 } = await userState.genProveReputationProof(
            attesterId,
            epkNonce
        )

        const username1_10 = 'test1'
        const username1_16 = ethers.utils.hexlify(
            ethers.utils.toUtf8Bytes(username1_10)
        )
        const username1 = hashOne(username1_16)
        await unirepSocialContract
            .setUsername(epochKey1, 0, username1, {
                value: DEFAULT_ATTESTING_FEE,
            })
            .then((t) => t.wait())
        console.log('set username to username1:', username1_10)

        // epoch transition 1
        {
            await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
            let tx = await unirepContract.beginEpochTransition()
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }

        //////// user state transition ////////
        // gen proof and verify proof off-chain
        await userState.waitForSync()
        const {
            startTransitionProof: startTransitionProof1,
            processAttestationProofs: processAttestationProofs1,
            finalTransitionProof: finalTransitionProof1,
        } = await userState.genUserStateTransitionProofs()
        let isValid = await startTransitionProof1.verify()
        expect(isValid, 'Verify start transition circuit off-chain failed').to
            .be.true

        // Verify start transition proof on-chain
        isValid = await unirepContract.verifyStartTransitionProof(
            startTransitionProof1.publicSignals,
            startTransitionProof1.proof
        )
        expect(isValid, 'Verify start transition circuit on-chain failed').to.be
            .true

        // start user state transition
        let tx = await unirepSocialContract.startUserStateTransition(
            startTransitionProof1.publicSignals,
            startTransitionProof1.proof
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

        // verify process attestation proofs
        for (let i = 0; i < processAttestationProofs1.length; i++) {
            expect(
                await processAttestationProofs1[i].verify(),
                'Verify process attestations circuit off-chain failed'
            ).to.be.true

            // Verify processAttestations proof on-chain
            const isProofValid =
                await unirepContract.verifyProcessAttestationProof(
                    processAttestationProofs1[i].publicSignals,
                    processAttestationProofs1[i].proof
                )
            expect(
                isProofValid,
                'Verify process attestations circuit on-chain failed'
            ).to.be.true

            const tx = await unirepSocialContract.processAttestations(
                processAttestationProofs1[i].publicSignals,
                processAttestationProofs1[i].proof
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
        }

        // verify final transition proof
        isValid = await finalTransitionProof1.verify()
        expect(isValid, 'Verify user state transition circuit off-chain failed')
            .to.be.true

        // Verify userStateTransition proof on-chain
        const isProofValid = await unirepContract.verifyUserStateTransition(
            finalTransitionProof1.publicSignals,
            finalTransitionProof1.proof
        )
        expect(
            isProofValid,
            'Verify user state transition circuit on-chain failed'
        ).to.be.true

        // update user state root
        tx = await unirepContract.updateUserStateRoot(
            finalTransitionProof1.publicSignals,
            finalTransitionProof1.proof
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

        // user1 should prove username
        await userState.waitForSync()
        const reputationProof1 = await userState.genProveReputationProof(
            attesterId,
            epkNonce,
            undefined,
            BigInt(1),
            username1_16
        )
        expect(await reputationProof1.verify(), 'username is not username1').to
            .be.true

        // set username2, username1 should be freed
        const { epochKey: epochKey2 } = await userState.genProveReputationProof(
            attesterId,
            epkNonce
        )
        const username2_10 = 'test2'
        const username2_16 = ethers.utils.hexlify(
            ethers.utils.toUtf8Bytes(username2_10)
        )
        const username2 = hashOne(username2_16)
        receipt = await unirepSocialContract
            .setUsername(epochKey2, username1, username2, {
                value: DEFAULT_ATTESTING_FEE,
            })
            .then((t) => t.wait())
        expect(receipt.status, 'set username to username2 failed').to.equal(1)
        console.log('set username to username2:', username2_10)

        // epoch transition 2
        {
            await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
            let tx = await unirepContract.beginEpochTransition()
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }

        //////// user state transition ////////
        // gen proof and verify proof off-chain
        await userState.waitForSync()
        const {
            startTransitionProof: startTransitionProof2,
            processAttestationProofs: processAttestationProofs2,
            finalTransitionProof: finalTransitionProof2,
        } = await userState.genUserStateTransitionProofs()
        isValid = await startTransitionProof2.verify()
        expect(isValid, 'Verify start transition circuit off-chain failed').to
            .be.true

        // Verify start transition proof on-chain
        isValid = await unirepContract.verifyStartTransitionProof(
            startTransitionProof2.publicSignals,
            startTransitionProof2.proof
        )
        expect(isValid, 'Verify start transition circuit on-chain failed').to.be
            .true

        // start user state transition
        tx = await unirepSocialContract.startUserStateTransition(
            startTransitionProof2.publicSignals,
            startTransitionProof2.proof
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

        // verify process attestation proofs
        for (let i = 0; i < processAttestationProofs2.length; i++) {
            expect(
                await processAttestationProofs2[i].verify(),
                'Verify process attestations circuit off-chain failed'
            ).to.be.true

            // Verify processAttestations proof on-chain
            const isProofValid =
                await unirepContract.verifyProcessAttestationProof(
                    processAttestationProofs2[i].publicSignals,
                    processAttestationProofs2[i].proof
                )
            expect(
                isProofValid,
                'Verify process attestations circuit on-chain failed'
            ).to.be.true

            const tx = await unirepSocialContract.processAttestations(
                processAttestationProofs2[i].publicSignals,
                processAttestationProofs2[i].proof
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
        }

        // verify final transition proof
        isValid = await finalTransitionProof2.verify()
        expect(isValid, 'Verify user state transition circuit off-chain failed')
            .to.be.true

        // Verify userStateTransition proof on-chain
        const isProofValid2 = await unirepContract.verifyUserStateTransition(
            finalTransitionProof2.publicSignals,
            finalTransitionProof2.proof
        )
        expect(
            isProofValid2,
            'Verify user state transition circuit on-chain failed'
        ).to.be.true

        // update user state root
        tx = await unirepContract.updateUserStateRoot(
            finalTransitionProof2.publicSignals,
            finalTransitionProof2.proof
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

        // user should prove username
        await userState.waitForSync()
        const reputationProof2 = await userState.genProveReputationProof(
            attesterId,
            epkNonce,
            undefined,
            BigInt(1),
            username2_16
        )
        expect(await reputationProof2.verify(), 'username is not username2').to
            .be.true

        // set username to username1 again
        const { epochKey: epochKey3 } = await userState.genProveReputationProof(
            attesterId,
            epkNonce
        )
        receipt = await unirepSocialContract
            .setUsername(epochKey3, username2, username1, {
                value: DEFAULT_ATTESTING_FEE,
            })
            .then((t) => t.wait())
        expect(receipt.status, 'Unable to use username 1').to.equal(1)
    })
})
