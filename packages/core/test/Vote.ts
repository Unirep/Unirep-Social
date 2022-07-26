// @ts-ignore
import { ethers } from 'hardhat'
import { BigNumberish, BigNumber } from 'ethers'
import { expect } from 'chai'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'
import * as config from '@unirep/circuits'
import { genEpochKey } from '@unirep/core'
import { deployUnirep, EpochKeyProof } from '@unirep/contracts'
import { ZkIdentity, genRandomSalt } from '@unirep/crypto'

import { genUserState } from './utils'
import { maxReputationBudget } from '../config/socialMedia'
import { deployUnirepSocial, UnirepSocial } from '../src/utils'

const DEFAULT_ATTESTING_FEE = BigNumber.from(1)

const getEpochKeyProof = async (unirepContract) => {
    const currentEpoch = await unirepContract.currentEpoch()
    const toEpochKey = genEpochKey(
        genRandomSalt(),
        currentEpoch,
        0
    ) as BigNumberish
    const proof = Array(8).fill('0')
    const publicSignals = [
        toEpochKey,
        genRandomSalt(),
        currentEpoch,
    ] as BigNumberish[]
    const epochKeyProof = new EpochKeyProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof)
    )
    await unirepContract
        .submitEpochKeyProof(publicSignals, proof)
        .then((t) => t.wait())
    const epochKeyProofIndex = await unirepContract.getProofIndex(
        epochKeyProof.hash()
    )
    return { epochKeyProofIndex, toEpochKey }
}

describe('Vote', function () {
    this.timeout(300000)

    let unirepContract
    let unirepSocialContract: UnirepSocial

    before(async () => {
        const accounts = await ethers.getSigners()

        const _settings = {
            maxUsers: config.MAX_USERS,
            maxAttesters: config.MAX_ATTESTERS,
            numEpochKeyNoncePerEpoch: config.NUM_EPOCH_KEY_NONCE_PER_EPOCH,
            maxReputationBudget: maxReputationBudget,
            epochLength: config.EPOCH_LENGTH,
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

    describe('Upvote', () => {
        it('submit upvote should succeed', async () => {
            const { toEpochKey, epochKeyProofIndex } = await getEpochKeyProof(
                unirepContract
            )
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
            const proveGraffiti = BigInt(0)
            const minPosRep = 0
            const graffitiPreImage = BigInt(0)
            const epkNonce = 0
            const upvoteValue = 3
            const reputationProof = await userState.genProveReputationProof(
                attesterId,
                epkNonce,
                minPosRep,
                proveGraffiti,
                graffitiPreImage,
                upvoteValue
            )
            const tx = await unirepSocialContract.vote(
                upvoteValue,
                0,
                toEpochKey,
                epochKeyProofIndex,
                reputationProof.publicSignals,
                reputationProof.proof,
                { value: DEFAULT_ATTESTING_FEE.mul(2), gasLimit: 1000000 }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit vote failed').to.equal(1)
        })

        it('submit upvote with different amount of nullifiers should fail', async () => {
            const { toEpochKey, epochKeyProofIndex } = await getEpochKeyProof(
                unirepContract
            )
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
            const proveGraffiti = BigInt(0)
            const minPosRep = 0,
                graffitiPreImage = BigInt(0)
            const epkNonce = 0
            const upvoteValue = 3
            const badUpvoteValue = upvoteValue + 1
            const reputationProof = await userState.genProveReputationProof(
                attesterId,
                epkNonce,
                minPosRep,
                proveGraffiti,
                graffitiPreImage,
                badUpvoteValue
            )
            const isValid = await reputationProof.verify()
            expect(isValid, 'Verify reputation proof off-chain failed').to.be
                .true

            await expect(
                unirepSocialContract.vote(
                    upvoteValue,
                    0,
                    toEpochKey,
                    epochKeyProofIndex,
                    reputationProof.publicSignals,
                    reputationProof.proof,
                    { value: DEFAULT_ATTESTING_FEE.mul(2), gasLimit: 1000000 }
                )
            ).to.be.revertedWith(
                'Unirep Social: submit different nullifiers amount from the vote value'
            )
        })

        it('submit zero proof index upvote should fail', async () => {
            const { toEpochKey } = await getEpochKeyProof(unirepContract)
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
            const proveGraffiti = BigInt(0)
            const minPosRep = 0,
                graffitiPreImage = BigInt(0)
            const epkNonce = 0
            const upvoteValue = 3
            const reputationProof = await userState.genProveReputationProof(
                attesterId,
                epkNonce,
                minPosRep,
                proveGraffiti,
                graffitiPreImage,
                upvoteValue
            )
            const isValid = await reputationProof.verify()
            expect(isValid, 'Verify reputation proof off-chain failed').to.be
                .true

            const zeroProofIndex = 0
            await expect(
                unirepSocialContract.vote(
                    upvoteValue,
                    0,
                    toEpochKey,
                    zeroProofIndex,
                    reputationProof.publicSignals,
                    reputationProof.proof,
                    { value: DEFAULT_ATTESTING_FEE.mul(2), gasLimit: 1000000 }
                )
            ).to.be.revertedWithCustomError(unirepContract, 'InvalidProofIndex')
        })

        it('submit upvote with both upvote and downvote value should fail', async () => {
            const { toEpochKey, epochKeyProofIndex } = await getEpochKeyProof(
                unirepContract
            )
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
            const proveGraffiti = BigInt(0)
            const minPosRep = 0,
                graffitiPreImage = BigInt(0)
            const epkNonce = 0
            const upvoteValue = 3
            const reputationProof = await userState.genProveReputationProof(
                attesterId,
                epkNonce,
                minPosRep,
                proveGraffiti,
                graffitiPreImage,
                upvoteValue
            )
            await expect(
                unirepSocialContract.vote(
                    upvoteValue,
                    5,
                    toEpochKey,
                    epochKeyProofIndex,
                    reputationProof.publicSignals,
                    reputationProof.proof,
                    { value: DEFAULT_ATTESTING_FEE.mul(2), gasLimit: 1000000 }
                )
            ).to.be.revertedWith(
                'Unirep Social: should only choose to upvote or to downvote'
            )
        })

        it('submit vote with 0 value should fail', async () => {
            const { toEpochKey, epochKeyProofIndex } = await getEpochKeyProof(
                unirepContract
            )
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
            const proveGraffiti = BigInt(0)
            const minPosRep = 0,
                graffitiPreImage = BigInt(0)
            const epkNonce = 0
            const upvoteValue = 3
            const reputationProof = await userState.genProveReputationProof(
                attesterId,
                epkNonce,
                minPosRep,
                proveGraffiti,
                graffitiPreImage,
                upvoteValue
            )
            await expect(
                unirepSocialContract.vote(
                    0,
                    0,
                    toEpochKey,
                    epochKeyProofIndex,
                    reputationProof.publicSignals,
                    reputationProof.proof,
                    { value: DEFAULT_ATTESTING_FEE.mul(2), gasLimit: 1000000 }
                )
            ).to.be.revertedWith(
                'Unirep Social: should submit a positive vote value'
            )
        })

        it('submit upvote proof with wrong attester id should fail', async () => {
            const { toEpochKey, epochKeyProofIndex } = await getEpochKeyProof(
                unirepContract
            )
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
            const proveGraffiti = BigInt(0)
            const minPosRep = 0,
                graffitiPreImage = BigInt(0)
            const epkNonce = 0
            const upvoteValue = 3
            const reputationProof = await userState.genProveReputationProof(
                attesterId,
                epkNonce,
                minPosRep,
                proveGraffiti,
                graffitiPreImage,
                upvoteValue
            )
            const falseAttesterId = attesterId + BigInt(1)
            reputationProof.publicSignals[reputationProof.idx.attesterId] =
                falseAttesterId

            await expect(
                unirepSocialContract.vote(
                    reputationProof.proveReputationAmount,
                    0,
                    toEpochKey,
                    epochKeyProofIndex,
                    reputationProof.publicSignals,
                    reputationProof.proof,
                    { value: DEFAULT_ATTESTING_FEE.mul(2), gasLimit: 1000000 }
                )
            ).to.be.revertedWith(
                'Unirep Social: submit a proof with different attester ID from Unirep Social'
            )
        })
    })
})
