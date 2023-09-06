// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { startServer } from './environment'

import {
    createPostSubsidy,
    signUp,
    userStateTransition,
    voteSubsidy,
} from './utils'
import express from 'express'

describe('ust', function () {
    this.timeout(0)
    const epochLength = 120
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
    })

    it('should do user state transition', async () => {
        // sign up first user
        const { iden } = await signUp(t)

        // first create a post
        const { post } = await createPostSubsidy(t, iden)

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

        // user state transition
        await userStateTransition(t, iden)
        expect(true).to.be.true
    })
})
