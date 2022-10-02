// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { BigNumber } from 'ethers'
import * as config from '@unirep/circuits'
import { deployUnirep } from '@unirep/contracts/deploy'
import { ZkIdentity } from '@unirep/crypto'

import { genUserState, leaveComment, publishPost } from './utils'
import {
    defaultCommentReputation,
    defaultPostReputation,
    maxReputationBudget,
} from '../config/socialMedia'
import { deployUnirepSocial, UnirepSocial } from '../src/utils'

const DEFAULT_ATTESTING_FEE = BigNumber.from(1)

describe('Post', function () {
    this.timeout(300000)

    let unirepContract
    let unirepSocialContract: UnirepSocial

    before(async () => {
        const accounts = await ethers.getSigners()

        const _settings = {
            maxUsers: config.MAX_USERS,
            maxAttesters: config.MAX_ATTESTERS,
            numEpochKeyNoncePerEpoch: config.NUM_EPOCH_KEY_NONCE_PER_EPOCH,
            maxReputationBudget,
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

    describe('Generate reputation proof for verification', () => {
        it('reputation proof should be verified valid off-chain and on-chain', async () => {
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
            const reputationProof = await userState.genProveReputationProof(
                attesterId,
                epkNonce,
                minPosRep,
                proveGraffiti,
                graffitiPreImage,
                defaultPostReputation
            )
            const isValid = await reputationProof.verify()
            expect(isValid, 'Verify reputation proof off-chain failed').to.be
                .true

            const isProofValid = await unirepContract.verifyReputation(
                reputationProof.publicSignals,
                reputationProof.proof
            )
            expect(isProofValid, 'proof is not valid').to.be.true
        })
    })

    describe('Publishing a post', () => {
        it('submit post should succeed', async () => {
            await publishPost(unirepSocialContract, ethers.provider)
        })

        it('submit post with different amount of nullifiers should fail', async () => {
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
            const reputationProof = await userState.genProveReputationProof(
                attesterId,
                epkNonce,
                minPosRep,
                proveGraffiti,
                graffitiPreImage,
                defaultPostReputation + 1
            )
            const isValid = await reputationProof.verify()
            expect(isValid, 'Verify reputation proof off-chain failed').to.be
                .true

            const content = 'some other post text'
            const hashedContent = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes(content)
            )
            await expect(
                unirepSocialContract.publishPost(
                    hashedContent,
                    reputationProof.publicSignals,
                    reputationProof.proof,
                    {
                        value: DEFAULT_ATTESTING_FEE,
                    }
                )
            ).to.be.revertedWith(
                'Unirep Social: submit different nullifiers amount from the required amount for post'
            )
        })

        it('submit post with the same proof should fail', async () => {
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
            const reputationProof = await userState.genProveReputationProof(
                attesterId,
                epkNonce,
                minPosRep,
                proveGraffiti,
                graffitiPreImage,
                defaultPostReputation
            )
            const isValid = await reputationProof.verify()
            expect(isValid, 'Verify reputation proof off-chain failed').to.be
                .true

            const content = 'some post text'
            const hashedContent = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes(content)
            )
            const tx = await unirepSocialContract.publishPost(
                hashedContent,
                reputationProof.publicSignals,
                reputationProof.proof,
                { value: DEFAULT_ATTESTING_FEE }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit post failed').to.equal(1)

            await expect(
                unirepSocialContract.publishPost(
                    hashedContent,
                    reputationProof.publicSignals,
                    reputationProof.proof,
                    {
                        value: DEFAULT_ATTESTING_FEE,
                    }
                )
            ).to.be.revertedWith('Unirep Social: the proof is submitted before')
        })
    })

    describe('Comment a post', () => {
        it('submit comment should succeed', async () => {
            const receipt = await publishPost(
                unirepSocialContract,
                ethers.provider
            )
            const data = unirepSocialContract.interface.parseLog(
                receipt.logs[1]
            )
            const postId = data.args._postId
            await leaveComment(unirepSocialContract, ethers.provider, postId)
        })

        it('submit comment with different amount of nullifiers should fail', async () => {
            const attesterId = BigInt(
                await unirepContract.attesters(unirepSocialContract.address)
            )
            const receipt = await publishPost(
                unirepSocialContract,
                ethers.provider
            )
            const data = unirepSocialContract.interface.parseLog(
                receipt.logs[1]
            )
            const postId = data.args._postId

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
            const reputationProof = await userState.genProveReputationProof(
                attesterId,
                epkNonce,
                minPosRep,
                proveGraffiti,
                graffitiPreImage,
                defaultCommentReputation + 1
            )
            const isValid = await reputationProof.verify()
            expect(isValid, 'Verify reputation proof off-chain failed').to.be
                .true

            const content = 'a comment that should fail'
            const hashedContent = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes(content)
            )
            await expect(
                unirepSocialContract.leaveComment(
                    postId,
                    hashedContent,
                    reputationProof.publicSignals,
                    reputationProof.proof,
                    { value: DEFAULT_ATTESTING_FEE }
                )
            ).to.be.revertedWith(
                'Unirep Social: submit different nullifiers amount from the required amount for comment'
            )
        })

        it('submit comment with the same proof should fail', async () => {
            const attesterId = BigInt(
                await unirepContract.attesters(unirepSocialContract.address)
            )

            const { logs } = await publishPost(
                unirepSocialContract,
                ethers.provider
            )
            const data = unirepSocialContract.interface.parseLog(logs[1])
            const postId = data.args._postId

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
            const minPosRep = 20,
                graffitiPreImage = BigInt(0)
            const epkNonce = 0
            const reputationProof = await userState.genProveReputationProof(
                attesterId,
                epkNonce,
                minPosRep,
                proveGraffiti,
                graffitiPreImage,
                defaultCommentReputation
            )
            const isValid = await reputationProof.verify()
            expect(isValid, 'Verify reputation proof off-chain failed').to.be
                .true

            const isProofValid = await unirepContract.verifyReputation(
                reputationProof.publicSignals,
                reputationProof.proof
            )
            expect(isProofValid, 'proof is not valid').to.be.true
            const content = 'some comment text'
            const hashedContent = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes(content)
            )
            const tx = await unirepSocialContract.leaveComment(
                postId,
                hashedContent,
                reputationProof.publicSignals,
                reputationProof.proof,
                { value: DEFAULT_ATTESTING_FEE }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit comment failed').to.equal(1)

            await expect(
                unirepSocialContract.leaveComment(
                    postId,
                    hashedContent,
                    reputationProof.publicSignals,
                    reputationProof.proof,
                    { value: DEFAULT_ATTESTING_FEE }
                )
            ).to.be.revertedWith('Unirep Social: the proof is submitted before')
        })
    })

    describe('Edit a post', () => {
        it('edit a post should succeed', async () => {
            const attesterId = BigInt(
                await unirepContract.attesters(unirepSocialContract.address)
            )
            const id = new ZkIdentity()
            let postId
            await unirepSocialContract
                .userSignUp(id.genIdentityCommitment())
                .then((t) => t.wait())
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                id
            )
            const epkNonce = 0
            const content = 'some post text'
            const hashedContent = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes(content)
            )
            {
                const proveGraffiti = BigInt(0)
                const minPosRep = 0
                const graffitiPreImage = BigInt(0)

                const reputationProof = await userState.genProveReputationProof(
                    attesterId,
                    epkNonce,
                    minPosRep,
                    proveGraffiti,
                    graffitiPreImage,
                    defaultPostReputation
                )
                const isValid = await reputationProof.verify()
                expect(isValid, 'Verify reputation proof off-chain failed').to
                    .be.true

                const { logs } = await unirepSocialContract
                    .publishPost(
                        hashedContent,
                        reputationProof.publicSignals,
                        reputationProof.proof,
                        { value: DEFAULT_ATTESTING_FEE }
                    )
                    .then((t) => t.wait())
                const data = unirepSocialContract.interface.parseLog(logs[1])
                postId = data.args._postId
            }

            {
                const { publicSignals, proof } =
                    await userState.genVerifyEpochKeyProof(epkNonce)

                const newContent = 'new post'
                const newHashedContent = ethers.utils.keccak256(
                    ethers.utils.toUtf8Bytes(newContent)
                )
                const tx = await unirepSocialContract.edit(
                    postId,
                    hashedContent,
                    newHashedContent,
                    publicSignals,
                    proof
                )
                const receipt = await tx.wait()
                expect(receipt.status, 'Edit post failed').to.equal(1)
            }
        })

        it('Submit a wrong epoch key proof should fail', async () => {
            const attesterId = BigInt(
                await unirepContract.attesters(unirepSocialContract.address)
            )
            const id = new ZkIdentity()
            let postId
            await unirepSocialContract
                .userSignUp(id.genIdentityCommitment())
                .then((t) => t.wait())
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                id
            )
            const epkNonce = 0
            const content = 'some post text'
            const hashedContent = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes(content)
            )
            {
                const proveGraffiti = BigInt(0)
                const minPosRep = 0
                const graffitiPreImage = BigInt(0)

                const reputationProof = await userState.genProveReputationProof(
                    attesterId,
                    epkNonce,
                    minPosRep,
                    proveGraffiti,
                    graffitiPreImage,
                    defaultPostReputation
                )
                const isValid = await reputationProof.verify()
                expect(isValid, 'Verify reputation proof off-chain failed').to
                    .be.true

                const { logs } = await unirepSocialContract
                    .publishPost(
                        hashedContent,
                        reputationProof.publicSignals,
                        reputationProof.proof,
                        { value: DEFAULT_ATTESTING_FEE }
                    )
                    .then((t) => t.wait())
                const data = unirepSocialContract.interface.parseLog(logs[1])
                postId = data.args._postId
            }

            {
                const wrongEpkNonce = 1
                const { publicSignals, proof } =
                    await userState.genVerifyEpochKeyProof(wrongEpkNonce)

                const newContent = 'new post'
                const newHashedContent = ethers.utils.keccak256(
                    ethers.utils.toUtf8Bytes(newContent)
                )
                await expect(
                    unirepSocialContract.edit(
                        postId,
                        hashedContent,
                        newHashedContent,
                        publicSignals,
                        proof
                    )
                ).to.be.revertedWith(
                    'Unirep Social: Mismatched epoch key proof to the post or the comment id'
                )
            }
        })
    })

    describe('Edit a comment', () => {
        it('edit a comment should succeed', async () => {
            const attesterId = BigInt(
                await unirepContract.attesters(unirepSocialContract.address)
            )
            let postId
            let commentId
            const content = 'some comment text'
            const hashedContent = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes(content)
            )
            {
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
                const reputationProof = await userState.genProveReputationProof(
                    attesterId,
                    epkNonce,
                    minPosRep,
                    proveGraffiti,
                    graffitiPreImage,
                    defaultPostReputation
                )
                const isValid = await reputationProof.verify()
                expect(isValid, 'Verify reputation proof off-chain failed').to
                    .be.true

                const content = 'some post text'
                const hashedContent = ethers.utils.keccak256(
                    ethers.utils.toUtf8Bytes(content)
                )
                const { logs } = await unirepSocialContract
                    .publishPost(
                        hashedContent,
                        reputationProof.publicSignals,
                        reputationProof.proof,
                        { value: DEFAULT_ATTESTING_FEE }
                    )
                    .then((t) => t.wait())
                const data = unirepSocialContract.interface.parseLog(logs[1])
                postId = data.args._postId
            }
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
            {
                const proveGraffiti = BigInt(0)
                const minPosRep = 20,
                    graffitiPreImage = BigInt(0)
                const reputationProof = await userState.genProveReputationProof(
                    attesterId,
                    epkNonce,
                    minPosRep,
                    proveGraffiti,
                    graffitiPreImage,
                    defaultCommentReputation
                )
                const isValid = await reputationProof.verify()
                expect(isValid, 'Verify reputation proof off-chain failed').to
                    .be.true

                const isProofValid = await unirepContract.verifyReputation(
                    reputationProof.publicSignals,
                    reputationProof.proof
                )
                expect(isProofValid, 'proof is not valid').to.be.true

                const { logs } = await unirepSocialContract
                    .leaveComment(
                        postId,
                        hashedContent,
                        reputationProof.publicSignals,
                        reputationProof.proof,
                        { value: DEFAULT_ATTESTING_FEE }
                    )
                    .then((t) => t.wait())
                const data = unirepSocialContract.interface.parseLog(logs[1])
                commentId = data.args._commentId
            }

            {
                const { publicSignals, proof } =
                    await userState.genVerifyEpochKeyProof(epkNonce)

                const newContent = 'new comment'
                const newHashedContent = ethers.utils.keccak256(
                    ethers.utils.toUtf8Bytes(newContent)
                )
                const tx = await unirepSocialContract.edit(
                    commentId,
                    hashedContent,
                    newHashedContent,
                    publicSignals,
                    proof
                )
                const receipt = await tx.wait()
                expect(receipt.status, 'Edit post failed').to.equal(1)
            }
        })

        it('edit comment with wrong epoch key proof should fail', async () => {
            const attesterId = BigInt(
                await unirepContract.attesters(unirepSocialContract.address)
            )
            let postId
            let commentId
            const content = 'some comment text'
            const hashedContent = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes(content)
            )
            {
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
                const reputationProof = await userState.genProveReputationProof(
                    attesterId,
                    epkNonce,
                    minPosRep,
                    proveGraffiti,
                    graffitiPreImage,
                    defaultPostReputation
                )
                const isValid = await reputationProof.verify()
                expect(isValid, 'Verify reputation proof off-chain failed').to
                    .be.true

                const content = 'some post text'
                const hashedContent = ethers.utils.keccak256(
                    ethers.utils.toUtf8Bytes(content)
                )
                const { logs } = await unirepSocialContract
                    .publishPost(
                        hashedContent,
                        reputationProof.publicSignals,
                        reputationProof.proof,
                        { value: DEFAULT_ATTESTING_FEE }
                    )
                    .then((t) => t.wait())
                const data = unirepSocialContract.interface.parseLog(logs[1])
                postId = data.args._postId
            }
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
            {
                const proveGraffiti = BigInt(0)
                const minPosRep = 20,
                    graffitiPreImage = BigInt(0)
                const reputationProof = await userState.genProveReputationProof(
                    attesterId,
                    epkNonce,
                    minPosRep,
                    proveGraffiti,
                    graffitiPreImage,
                    defaultCommentReputation
                )
                const isValid = await reputationProof.verify()
                expect(isValid, 'Verify reputation proof off-chain failed').to
                    .be.true

                const isProofValid = await unirepContract.verifyReputation(
                    reputationProof.publicSignals,
                    reputationProof.proof
                )
                expect(isProofValid, 'proof is not valid').to.be.true

                const { logs } = await unirepSocialContract
                    .leaveComment(
                        postId,
                        hashedContent,
                        reputationProof.publicSignals,
                        reputationProof.proof,
                        { value: DEFAULT_ATTESTING_FEE }
                    )
                    .then((t) => t.wait())
                const data = unirepSocialContract.interface.parseLog(logs[1])
                commentId = data.args._commentId
            }

            {
                const wrongEpkNonce = 1
                const { publicSignals, proof } =
                    await userState.genVerifyEpochKeyProof(wrongEpkNonce)

                const newContent = 'new comment'
                const newHashedContent = ethers.utils.keccak256(
                    ethers.utils.toUtf8Bytes(newContent)
                )
                await expect(
                    unirepSocialContract.edit(
                        commentId,
                        hashedContent,
                        newHashedContent,
                        publicSignals,
                        proof
                    )
                ).to.be.revertedWith(
                    'Unirep Social: Mismatched epoch key proof to the post or the comment id'
                )
            }
        })
    })
})
