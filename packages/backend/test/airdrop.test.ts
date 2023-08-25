// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { startServer } from './environment'
import express from 'express'

import {
    airdrop,
    createPostSubsidy,
    signUp,
    userStateTransition,
    voteSubsidy,
} from './utils'

const airdropReputation = 7
const epochLength = 200

describe('airdrop', function () {
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
            airdropReputation,
            epochLength,
        })
        Object.assign(t.context, context)
    })

    it('should get negative reputation airdrop', async () => {
        // sign up first user
        const user1 = await signUp(t)

        // first create a post
        const { post } = await createPostSubsidy(t, user1.iden)

        // sign up second user
        const user2 = await signUp(t)

        // downvote the post
        const upvote = 0
        const downvote = 8
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

        // user state transition
        await userStateTransition(t, user1.iden)

        // user prove airdrop
        await airdrop(t, user1.iden)

        // user state transition
        await userStateTransition(t, user1.iden)

        // user can post in the 3rd epoch
        await createPostSubsidy(t, user1.iden)
        expect(true).to.be.true
    })

    it('should not claim airdrop twice', async () => {
        // sign up first user
        const user1 = await signUp(t)

        // first create a post
        const { post } = await createPostSubsidy(t, user1.iden)

        // sign up second user
        const user2 = await signUp(t)

        // downvote the post
        const upvote = 0
        const downvote = 8
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

        // user state transition
        await userStateTransition(t, user1.iden)

        // user prove airdrop
        await airdrop(t, user1.iden)
        try {
            await airdrop(t, user1.iden)
            expect(false).to.be.true
        } catch (_) {
            expect(true).to.be.true
        }
    })
})
