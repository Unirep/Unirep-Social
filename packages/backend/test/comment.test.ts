// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { startServer } from './environment'

import {
    createComment,
    createPost,
    editComment,
    deleteComment,
    queryComment,
    signUp,
    createPostSubsidy,
    voteSubsidy,
    userStateTransition,
} from './utils'
import express from 'express'
import { DELETED_CONTENT } from '../src/constants'

const epochLength = 200
let iden: any
let postId: string

describe('comment', function () {
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
        const { post } = await createPostSubsidy(t, user1.iden)

        // sign up second user
        const user2 = await signUp(t)

        // upvote the post
        {
            const upvote = 15
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

        // user state transition
        await userStateTransition(t, user1.iden)

        // create post
        const { post: post2 } = await createPost(t, user1.iden)
        iden = user1.iden
        postId = post2._id
    })

    it('should create a comment', async () => {
        // leave a comment
        const { comment } = await createComment(t, iden, postId)
        const data = await queryComment(t, comment._id)
        expect(comment.content).to.equal(data.content)
    })

    it('should edit a comment', async () => {
        // edit a comment
        const newContent = 'new content'
        const { comment } = await editComment(t, iden, postId, newContent)
        const data = await queryComment(t, comment._id)
        expect(data.content).to.equal(newContent)
        expect(data.lastUpdatedAt).to.not.equal(data.createdAt)
    })

    it('should delete a comment', async () => {
        // delete a comment
        const { comment } = await deleteComment(t, iden, postId)
        expect(comment.content).to.equal(DELETED_CONTENT)
        expect(comment.lastUpdatedAt).to.not.equal(comment.createdAt)
    })
})
