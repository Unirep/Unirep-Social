// @ts-ignore
import { ethers } from 'hardhat'
import { BigNumberish, BigNumber } from 'ethers'
import { expect } from 'chai'
import * as config from '@unirep/circuits'
import * as ContractConfig from '@unirep/contracts'
import { genEpochKey } from '@unirep/core'
import { deployUnirep } from '@unirep/contracts/deploy'
import { ZkIdentity, genRandomSalt } from '@unirep/crypto'

import { genUserState } from './utils'
import { maxReputationBudget } from '../config/socialMedia'
import { deployUnirepSocial, UnirepSocial } from '../src/utils'

const DEFAULT_ATTESTING_FEE = BigNumber.from(1)

describe('Vote', function () {
    this.timeout(300000)

    let unirepContract
    let unirepSocialContract: UnirepSocial

    before(async () => {
        const accounts = await ethers.getSigners()

        const _settings = {
            // maxUsers: config.MAX_USERS,
            // maxAttesters: config.MAX_ATTESTERS,
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

    describe('Upvote', () => {
        it('submit upvote should succeed', async () => {
            const currentEpoch = await unirepContract.currentEpoch()
            const toEpochKey = genEpochKey(
                genRandomSalt(),
                currentEpoch,
                0
            ) as BigNumberish
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
            await unirepSocialContract
                .vote(
                    upvoteValue,
                    0,
                    toEpochKey,
                    reputationProof.publicSignals,
                    reputationProof.proof,
                    { value: DEFAULT_ATTESTING_FEE.mul(2) }
                )
                .then((t) => t.wait())
        })

        it('submit upvote with different amount of nullifiers should fail', async () => {
            const currentEpoch = await unirepContract.currentEpoch()
            const toEpochKey = genEpochKey(
                genRandomSalt(),
                currentEpoch,
                0
            ) as BigNumberish
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
                    reputationProof.publicSignals,
                    reputationProof.proof,
                    { value: DEFAULT_ATTESTING_FEE.mul(2), gasLimit: 1000000 }
                )
            ).to.be.revertedWith(
                'Unirep Social: submit different nullifiers amount from the vote value'
            )
        })

        it('submit upvote with both upvote and downvote value should fail', async () => {
            const currentEpoch = await unirepContract.currentEpoch()
            const toEpochKey = genEpochKey(
                genRandomSalt(),
                currentEpoch,
                0
            ) as BigNumberish
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
                    reputationProof.publicSignals,
                    reputationProof.proof,
                    { value: DEFAULT_ATTESTING_FEE.mul(2), gasLimit: 1000000 }
                )
            ).to.be.revertedWith(
                'Unirep Social: should only choose to upvote or to downvote'
            )
        })

        it('submit vote with 0 value should fail', async () => {
            const currentEpoch = await unirepContract.currentEpoch()
            const toEpochKey = genEpochKey(
                genRandomSalt(),
                currentEpoch,
                0
            ) as BigNumberish
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
                    reputationProof.publicSignals,
                    reputationProof.proof,
                    { value: DEFAULT_ATTESTING_FEE.mul(2), gasLimit: 1000000 }
                )
            ).to.be.revertedWith(
                'Unirep Social: should submit a positive vote value'
            )
        })

        it('submit upvote proof with wrong attester id should fail', async () => {
            const currentEpoch = await unirepContract.currentEpoch()
            const toEpochKey = genEpochKey(
                genRandomSalt(),
                currentEpoch,
                0
            ) as BigNumberish
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
                    reputationProof.publicSignals,
                    reputationProof.proof,
                    { value: DEFAULT_ATTESTING_FEE.mul(2), gasLimit: 1000000 }
                )
            ).to.be.revertedWith(
                'Unirep Social: submit a proof with different attester ID from Unirep Social'
            )
        })

        it('submit upvote proof twice should fail', async () => {
            const currentEpoch = await unirepContract.currentEpoch()
            const toEpochKey = genEpochKey(
                genRandomSalt(),
                currentEpoch,
                0
            ) as BigNumberish
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
            await unirepSocialContract
                .vote(
                    upvoteValue,
                    0,
                    toEpochKey,
                    reputationProof.publicSignals,
                    reputationProof.proof,
                    { value: DEFAULT_ATTESTING_FEE.mul(2) }
                )
                .then((t) => t.wait())

            await expect(
                unirepSocialContract.vote(
                    upvoteValue,
                    0,
                    toEpochKey,
                    reputationProof.publicSignals,
                    reputationProof.proof,
                    { value: DEFAULT_ATTESTING_FEE.mul(2) }
                )
            ).to.be.revertedWith('Unirep Social: the proof is submitted before')
        })
    })
})
