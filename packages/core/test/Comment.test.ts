// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { deployUnirep } from '@unirep/contracts/deploy'
import { genEpochKey } from '@unirep/utils'
import { Identity } from '@semaphore-protocol/identity'
import { deployUnirepSocial, Unirep, UnirepSocial } from '../deploy'
import { genUserState } from './utils'
import { defaultEpochLength } from '../src/config'
import { EpochKeyProof } from '@unirep/circuits'

describe('Comment', function () {
    this.timeout(1000000)
    let unirepContract: Unirep
    let unirepSocialContract: UnirepSocial
    let admin
    let attesterId
    let chainId
    const id = new Identity()
    const content = 'some post text'
    const hashedContent = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(content)
    )
    let commentReputation
    const postId = 1
    const commentId = 2
    const epkNonce = 0
    const revealNonce = true

    before(async () => {
        const accounts = await ethers.getSigners()
        admin = accounts[0]
        const network = await accounts[0].provider.getNetwork()
        chainId = network.chainId

        unirepContract = await deployUnirep(admin)
        unirepSocialContract = await deployUnirepSocial(
            admin,
            unirepContract.address
        )
        attesterId = unirepSocialContract.address
        commentReputation = (
            await unirepSocialContract.commentReputation()
        ).toNumber()
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )

        // user sign up
        {
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()

            await unirepSocialContract
                .connect(admin)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }
        // user 1 epoch key
        const epoch = await unirepContract.attesterCurrentEpoch(attesterId)
        const nonce = 0
        const epochKey = genEpochKey(
            id.secret,
            attesterId,
            epoch,
            nonce,
            chainId
        )

        // sign up another user and vote
        {
            const id2 = new Identity()
            const userState2 = await genUserState(
                ethers.provider,
                unirepContract.address,
                id2,
                attesterId
            )
            const { publicSignals, proof } =
                await userState2.genUserSignUpProof()

            await unirepSocialContract
                .connect(admin)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
            await userState2.waitForSync()

            const voteProof = await userState2.genActionProof({
                revealNonce: true,
                epkNonce: 0,
                notEpochKey: epochKey,
            })

            const upvote = 30
            const downvote = 0
            await unirepSocialContract
                .connect(admin)
                .voteSubsidy(
                    upvote,
                    downvote,
                    epochKey,
                    voteProof.publicSignals,
                    voteProof.proof
                )
                .then((t) => t.wait())
            userState2.stop()
        }

        // epoch transition
        await ethers.provider.send('evm_increaseTime', [defaultEpochLength])
        await ethers.provider.send('evm_mine', [])

        // user state transition
        {
            const toEpoch = await unirepContract.attesterCurrentEpoch(
                attesterId
            )
            await userState.waitForSync()
            const { publicSignals, proof } =
                await userState.genUserStateTransitionProof({ toEpoch })
            await unirepContract
                .connect(admin)
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }

        // post
        {
            const postReputation = await unirepSocialContract.postReputation()
            await userState.waitForSync()
            const { publicSignals, proof } = await userState.genActionProof({
                spentRep: postReputation.toNumber(),
            })
            await unirepSocialContract
                .publishPost(hashedContent, publicSignals, proof)
                .then((t) => t.wait())
        }
        userState.stop()
    })

    {
        let snapshot

        beforeEach(async () => {
            snapshot = await ethers.provider.send('evm_snapshot', [])
        })

        afterEach(async () => {
            await ethers.provider.send('evm_revert', [snapshot])
        })
    }

    it('submit comment should succeed', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof, epoch, epochKey } =
            await userState.genActionProof({ spentRep: commentReputation })
        const tx = await unirepSocialContract.leaveComment(
            postId,
            hashedContent,
            publicSignals,
            proof
        )
        await expect(tx)
            .to.emit(unirepSocialContract, 'CommentSubmitted')
            .withArgs(epoch, postId, epochKey, commentId, hashedContent, 0)
        userState.stop()
    })

    it('submit comment with min rep should succeed', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const minRep = 10
        const { publicSignals, proof, epoch, epochKey, proveMinRep } =
            await userState.genActionProof({
                spentRep: commentReputation,
                minRep,
            })
        const tx = await unirepSocialContract.leaveComment(
            postId,
            hashedContent,
            publicSignals,
            proof
        )
        expect(proveMinRep).to.equal('1')
        await expect(tx)
            .to.emit(unirepSocialContract, 'CommentSubmitted')
            .withArgs(epoch, postId, epochKey, commentId, hashedContent, minRep)
        userState.stop()
    })

    it('submit comment with different amount of nullifiers should fail', async () => {
        const spentRep = 2
        expect(spentRep).not.equal(commentReputation)
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            spentRep,
        })
        await expect(
            unirepSocialContract.leaveComment(
                postId,
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: invalid rep nullifier')
        userState.stop()
    })

    it('submit comment with the same proof should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            spentRep: commentReputation,
        })
        await unirepSocialContract
            .leaveComment(postId, hashedContent, publicSignals, proof)
            .then((t) => t.wait())
        await expect(
            unirepSocialContract.leaveComment(
                postId,
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: the proof is submitted before')
        userState.stop()
    })

    it('submit comment with the invalid proof should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals } = await userState.genActionProof({
            spentRep: commentReputation,
        })
        const proof = Array(8).fill(0)
        await expect(
            unirepSocialContract.leaveComment(
                postId,
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: proof is invalid')
        userState.stop()
    })

    it('submit comment with the invalid state tree root should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof, idx } = await userState.genActionProof({
            spentRep: commentReputation,
        })
        publicSignals[idx.stateTreeRoot] = BigInt(1234)
        await expect(
            unirepSocialContract.leaveComment(
                postId,
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: GST root does not exist in epoch')
        userState.stop()
    })

    it('submit comment with the wrong epoch should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const wrongEpoch = 0
        const { publicSignals, proof, idx } = await userState.genActionProof({
            spentRep: commentReputation,
        })
        const stateTree = await userState.sync.genStateTree(wrongEpoch)
        const wrongEpochControl = EpochKeyProof.buildControl({
            attesterId: BigInt(unirepSocialContract.address),
            epoch: BigInt(wrongEpoch),
            nonce: BigInt(0),
            revealNonce: BigInt(0),
            chainId: BigInt(chainId),
        })
        publicSignals[idx.stateTreeRoot] = stateTree.root.toString()
        publicSignals[idx.control0] = wrongEpochControl
        await expect(
            unirepSocialContract.leaveComment(
                postId,
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: epoch mismatches')
        userState.stop()
    })

    it('submit comment with the wrong attester ID should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof, idx, epoch } =
            await userState.genActionProof({ spentRep: commentReputation })

        const wrongControl = EpochKeyProof.buildControl({
            attesterId: BigInt(1234),
            epoch: epoch,
            nonce: BigInt(0),
            revealNonce: BigInt(0),
            chainId: BigInt(chainId),
        })
        publicSignals[idx.control0] = wrongControl
        await expect(
            unirepSocialContract.leaveComment(
                postId,
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: attesterId mismatches')
        userState.stop()
    })

    it('submit comment with the wrong post ID should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            spentRep: commentReputation,
        })

        const wrongPostId = await unirepSocialContract.contentId()
        await expect(
            unirepSocialContract.leaveComment(
                wrongPostId,
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: post ID is invalid')
        userState.stop()
    })

    it('submit comment subisy should succeed', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof, epoch, epochKey, minRep } =
            await userState.genActionProof({ epkNonce, revealNonce })
        const tx = await unirepSocialContract.publishCommentSubsidy(
            postId,
            hashedContent,
            publicSignals,
            proof
        )
        await expect(tx)
            .to.emit(unirepSocialContract, 'CommentSubmitted')
            .withArgs(epoch, postId, epochKey, commentId, hashedContent, minRep)
        userState.stop()
    })

    it('submit comment subsidy with min rep should succeed', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const minRep = 10
        const { publicSignals, proof, epoch, epochKey, proveMinRep } =
            await userState.genActionProof({ epkNonce, revealNonce, minRep })
        const tx = await unirepSocialContract.publishCommentSubsidy(
            postId,
            hashedContent,
            publicSignals,
            proof
        )
        expect(proveMinRep).to.equal('1')
        await expect(tx)
            .to.emit(unirepSocialContract, 'CommentSubmitted')
            .withArgs(epoch, postId, epochKey, commentId, hashedContent, minRep)
        userState.stop()
    })

    it('submit comment subsidy without revealing epoch key nonce should fail', async () => {
        const falseReveal = false
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            epkNonce,
            revealNonce: falseReveal,
        })
        await expect(
            unirepSocialContract.publishCommentSubsidy(
                postId,
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: epoch key nonce is not valid')
        userState.stop()
    })

    it('submit comment subsidy with wrong epoch key nonce should fail', async () => {
        const wrongNonce = 2
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            epkNonce: wrongNonce,
            revealNonce,
        })
        await expect(
            unirepSocialContract.publishCommentSubsidy(
                postId,
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: epoch key nonce is not valid')
        userState.stop()
    })

    it('submit comment subsidy with the same proof should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            epkNonce,
            revealNonce,
        })
        await unirepSocialContract
            .publishCommentSubsidy(postId, hashedContent, publicSignals, proof)
            .then((t) => t.wait())
        await expect(
            unirepSocialContract.publishCommentSubsidy(
                postId,
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: the proof is submitted before')
        userState.stop()
    })

    it('submit comment subsidy with the invalid proof should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals } = await userState.genActionProof({
            epkNonce,
            revealNonce,
        })
        const proof = Array(8).fill(0)
        await expect(
            unirepSocialContract.publishCommentSubsidy(
                postId,
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: proof is invalid')
        userState.stop()
    })

    it('submit comment with the invalid state tree root should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof, idx } = await userState.genActionProof({
            spentRep: commentReputation,
        })
        publicSignals[idx.stateTreeRoot] = BigInt(1234)
        await expect(
            unirepSocialContract.leaveComment(
                postId,
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: GST root does not exist in epoch')
        userState.stop()
    })

    it('submit comment subsidy with the wrong epoch should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const wrongEpoch = 0
        const { publicSignals, proof, idx } = await userState.genActionProof({
            epkNonce,
            revealNonce,
        })
        const stateTree = await userState.sync.genStateTree(wrongEpoch)
        const wrongEpochControl = EpochKeyProof.buildControl({
            attesterId: BigInt(unirepSocialContract.address),
            epoch: BigInt(wrongEpoch),
            nonce: BigInt(epkNonce),
            revealNonce: BigInt(revealNonce),
            chainId: BigInt(chainId),
        })
        publicSignals[idx.stateTreeRoot] = stateTree.root.toString()
        publicSignals[idx.control0] = wrongEpochControl
        await expect(
            unirepSocialContract.publishCommentSubsidy(
                postId,
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: epoch mismatches')
        userState.stop()
    })

    it('submit comment subsidy with the wrong attester ID should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof, idx, epoch } =
            await userState.genActionProof({ epkNonce, revealNonce })

        const wrongControl = EpochKeyProof.buildControl({
            attesterId: BigInt(1234),
            epoch: epoch,
            nonce: BigInt(epkNonce),
            revealNonce: BigInt(revealNonce),
            chainId: BigInt(chainId),
        })
        publicSignals[idx.control0] = wrongControl
        await expect(
            unirepSocialContract.publishCommentSubsidy(
                postId,
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: attesterId mismatches')
        userState.stop()
    })

    it('submit comment subsidy with the wrong post ID should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            epkNonce,
            revealNonce,
        })

        const wrongPostId = await unirepSocialContract.contentId()
        await expect(
            unirepSocialContract.publishCommentSubsidy(
                wrongPostId,
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: post ID is invalid')
        userState.stop()
    })

    it('requesting too much subsidy should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const subsidy = await unirepSocialContract.subsidy()
        const commentReputation = await unirepSocialContract.commentReputation()
        const iterations = Math.floor(
            subsidy.toNumber() / commentReputation.toNumber()
        )
        for (let i = 0; i < iterations; i++) {
            const { publicSignals, proof } = await userState.genActionProof({
                epkNonce,
                revealNonce,
            })
            await unirepSocialContract
                .publishCommentSubsidy(
                    postId,
                    hashedContent,
                    publicSignals,
                    proof
                )
                .then((t) => t.wait())
        }
        const { publicSignals, proof } = await userState.genActionProof({
            epkNonce,
            revealNonce,
        })
        await expect(
            unirepSocialContract.publishCommentSubsidy(
                postId,
                hashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: requesting too much subsidy')
        userState.stop()
    })
})
