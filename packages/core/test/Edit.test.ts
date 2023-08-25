// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { deployUnirep } from '@unirep/contracts/deploy'
import { Identity } from '@semaphore-protocol/identity'
import { genEpochKey } from '@unirep/utils'
import { deployUnirepSocial, Unirep, UnirepSocial } from '../deploy'
import { genUserState } from './utils'
import { defaultEpochLength } from '../src/config'

describe('Edit', function () {
    this.timeout(1000000)
    let unirepContract: Unirep
    let unirepSocialContract: UnirepSocial
    let attesterId
    const id = new Identity()
    const content = 'some post text'
    const newContent = 'new post text'
    const hashedContent = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(content)
    )
    const newHashedContent = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(newContent)
    )
    const postId = 1

    before(async () => {
        const accounts = await ethers.getSigners()
        const admin = accounts[0]

        unirepContract = await deployUnirep(admin)
        unirepSocialContract = await deployUnirepSocial(
            admin,
            unirepContract.address
        )
        attesterId = unirepSocialContract.address
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
        const epochKey = genEpochKey(id.secret, attesterId, epoch, nonce)

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
            userState2.sync.stop()
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
            const {
                publicSignals,
                proof,
                epoch: currentEpoch,
                epochKey: currentEpochKey,
            } = await userState.genActionProof({
                spentRep: postReputation.toNumber(),
            })
            const tx = await unirepSocialContract.publishPost(
                hashedContent,
                publicSignals,
                proof
            )
            expect(tx)
                .to.emit(unirepSocialContract, 'PostSubmitted')
                .withArgs(
                    currentEpoch,
                    postId,
                    currentEpochKey,
                    hashedContent,
                    0
                )
        }

        userState.sync.stop()
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

    it('epoch key proof should be verified valid off-chain and on-chain', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )

        const proof = await userState.genEpochKeyLiteProof()
        const isValid = await proof.verify()
        expect(isValid).to.be.true

        userState.sync.stop()
    })

    it('edit a post should succeed', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genEpochKeyLiteProof()
        const tx = await unirepSocialContract.edit(
            postId,
            hashedContent,
            newHashedContent,
            publicSignals,
            proof
        )

        await expect(tx)
            .to.emit(unirepSocialContract, 'ContentUpdated')
            .withArgs(postId, hashedContent, newHashedContent)
        userState.sync.stop()
    })

    it('edit a post with the same proof should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genEpochKeyLiteProof()
        await unirepSocialContract
            .edit(postId, hashedContent, newHashedContent, publicSignals, proof)
            .then((t) => t.wait())

        await expect(
            unirepSocialContract.edit(
                postId,
                hashedContent,
                newHashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: the proof is submitted before')
        userState.sync.stop()
    })

    it('edit a post with invalid content id should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const wrongPostId = await unirepSocialContract.contentId()
        const { publicSignals, proof } = await userState.genEpochKeyLiteProof()

        await expect(
            unirepSocialContract.edit(
                wrongPostId,
                hashedContent,
                newHashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: content ID is invalid')
        userState.sync.stop()
    })

    it('edit a post with the wrong epoch key should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const wrongNonce = 1
        const { publicSignals, proof } = await userState.genEpochKeyLiteProof({
            nonce: wrongNonce,
        })

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
        userState.sync.stop()
    })

    it('edit a post with the invalid proof should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals } = await userState.genEpochKeyLiteProof()
        const proof = Array(8).fill(0)

        await expect(
            unirepSocialContract.edit(
                postId,
                hashedContent,
                newHashedContent,
                publicSignals,
                proof
            )
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidProof')
        userState.sync.stop()
    })
})
