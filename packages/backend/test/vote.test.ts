// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { startServer } from './environment'

import {
    createCommentSubsidy,
    createPostSubsidy,
    signUp,
    userStateTransition,
    vote,
    voteSubsidy,
} from './utils'
import express from 'express'

describe('vote', function () {
    const epochLength = 200
    let iden: any
    let post: any
    let comment: any
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
        const context = await startServer(deployer, app, { epochLength })
        Object.assign(t, {
            ...t,
            epochLength,
            context,
        })

        // sign up first user
        const user1 = await signUp(t)

        // first create a post
        const { post: post1 } = await createPostSubsidy(t, user1.iden)

        // sign up second user
        const user2 = await signUp(t)

        // upvote the post
        {
            const upvote = 15
            const downvote = 0
            const receiver = post1.epochKey.toString()
            await voteSubsidy(
                t,
                user2.iden,
                receiver,
                post1._id,
                true,
                upvote,
                downvote
            )
        }

        // user state transition
        await userStateTransition(t, user1.iden)

        // create post
        const { post: post2 } = await createPostSubsidy(t, user1.iden)
        const data = await createCommentSubsidy(t, user1.iden, post2._id)
        iden = user1.iden
        post = post2
        comment = data.comment
    })

    it('should vote on a post', async () => {
        // upvote the post
        {
            const upvote = 5
            const downvote = 0
            const receiver = post.epochKey.toString()
            await vote(t, iden, receiver, post._id, true, upvote, downvote)
        }

        // downvote the post
        {
            const upvote = 0
            const downvote = 2
            const receiver = post.epochKey.toString()
            await vote(t, iden, receiver, post._id, true, upvote, downvote)
        }
        expect(true).to.be.true
    })

    it('should vote on comment', async () => {
        // upvote the comment
        {
            const upvote = 4
            const downvote = 0
            const receiver = comment.epochKey.toString()
            await vote(t, iden, receiver, comment._id, false, upvote, downvote)
        }

        // downvote the comment
        {
            const upvote = 0
            const downvote = 1
            const receiver = comment.epochKey.toString()
            await vote(t, iden, receiver, comment._id, false, upvote, downvote)
        }
        expect(true).to.be.true
    })
})
