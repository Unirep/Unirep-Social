// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { startServer } from './environment'

import {
    createPost,
    createPostSubsidy,
    deletePost,
    editPost,
    queryPost,
    signUp,
    userStateTransition,
    voteSubsidy,
} from './utils'
import express from 'express'
import { DELETED_CONTENT } from '../src/constants'

describe('post', function () {
    this.timeout(0)
    const epochLength = 200
    let user: any
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
        const { iden } = await signUp(t)

        // first create a post
        const { post } = await createPostSubsidy(t, iden)

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
        await userStateTransition(t, iden)
        user = iden
    })

    it('should create a post', async () => {
        console.log('create post')
        const { post } = await createPost(t, user)
        console.log('query post 1')
        const data = await queryPost(t, post._id)
        expect(post.content).to.deep.equal(data.content)
    })

    it('should edit a post', async () => {
        const newContent = 'new content'
        const newTitle = 'new title'
        console.log('edit post ')
        const { post } = await editPost(t, user, newTitle, newContent)
        console.log('query post 2')
        const data = await queryPost(t, post._id)
        expect(data.content).to.equal(newContent)
        expect(data.title).to.equal(newTitle)
        expect(data.lastUpdatedAt).to.not.equal(data.createdAt)
    })

    it('should delete a post', async () => {
        const { post } = await deletePost(t, user)
        expect(post.content).to.equal(DELETED_CONTENT)
        expect(post.lastUpdatedAt).to.not.equal(post.createdAt)
    })
})
