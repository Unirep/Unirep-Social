// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { startServer } from './environment'
import express from 'express'

import {
    createPostSubsidy,
    createCommentSubsidy,
    signUp,
    voteSubsidy,
} from './utils'

describe('subsidy', function () {
    this.timeout(0)
    let t = {
        context: {},
    }
    const app = express()
    before(async () => {
        const accounts = await ethers.getSigners()
        const deployer = new ethers.Wallet(
            '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
            accounts[0].provider
        )
        const context = await startServer(deployer, app, {
            airdropReputation: 0,
            epkSubsidy: 9,
            epochLength: 150000,
        })
        Object.assign(t.context, context)
    })

    it('should create post with subsidy', async () => {
        // sign up user
        const { iden } = await signUp(t)

        // post subsidy
        await createPostSubsidy(t, iden)
        expect(true).to.be.true
    })

    it('should create comment with subsidy', async () => {
        // sign up user
        const { iden } = await signUp(t)

        // post subsidy
        const { post } = await createPostSubsidy(t, iden)

        // coment subsidy
        await createCommentSubsidy(t, iden, post._id)
        expect(true).to.be.true
    })

    it('should not post with too much subsidy', async () => {
        // sign up user
        const { iden } = await signUp(t)

        // post subsidy
        await createPostSubsidy(t, iden)
        try {
            await createPostSubsidy(t, iden)
            expect(false).to.be.true
        } catch (_) {
            expect(true).to.be.true
        }
    })

    it('should not comment with too much subsidy', async () => {
        // sign up user
        const { iden } = await signUp(t)

        // post subsidy
        const { post } = await createPostSubsidy(t, iden)

        // coment subsidy
        await createCommentSubsidy(t, iden, post._id)
        try {
            await createCommentSubsidy(t, iden, post._id)
            expect(false).to.be.true
        } catch (_) {
            expect(true).to.be.true
        }
    })

    it('should vote with subsidy on a post', async () => {
        // sign up first user
        const user1 = await signUp(t)

        // first create a post
        const { post } = await createPostSubsidy(t, user1.iden)

        // sign up second user
        const user2 = await signUp(t)

        // upvote the post
        {
            const upvote = 5
            const downvote = 0
            const receiver = post.epochKey.toString()
            await voteSubsidy(
                t,
                user2.iden,
                receiver,
                post._id,
                true,
                upvote,
                downvote
            )
        }

        // downvote the post
        {
            const upvote = 0
            const downvote = 2
            const receiver = post.epochKey.toString()
            await voteSubsidy(
                t,
                user2.iden,
                receiver,
                post._id,
                true,
                upvote,
                downvote
            )
        }
        expect(true).to.be.true
    })

    it('should vote with subsidy on comment', async () => {
        // sign up first user
        const user1 = await signUp(t)

        // first create a post
        const { post } = await createPostSubsidy(t, user1.iden)

        // leave a comment
        // Object.assign(t.context, { ...t.context, postId: post.transaction })
        const { comment } = await createCommentSubsidy(t, user1.iden, post._id)

        // sign up second user
        const user2 = await signUp(t)

        // upvote the comment
        {
            const upvote = 4
            const downvote = 0
            const receiver = comment.epochKey.toString()
            await voteSubsidy(
                t,
                user2.iden,
                receiver,
                comment._id,
                false,
                upvote,
                downvote
            )
        }

        // downvote the comment
        {
            const upvote = 0
            const downvote = 1
            const receiver = comment.epochKey.toString()
            await voteSubsidy(
                t,
                user2.iden,
                receiver,
                comment._id,
                false,
                upvote,
                downvote
            )
        }
        expect(true).to.be.true
    })
})
