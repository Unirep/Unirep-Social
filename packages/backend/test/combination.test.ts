// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { startServer } from './environment'
import express from 'express'

import {
    createPostSubsidy,
    signUp,
    setUsername,
    userStateTransition,
    voteSubsidy,
} from './utils'

const epochLength = 3000

describe('combination', function () {
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
        Object.assign(t.context, context)
    })

    // test('if the user has username, should not pass 0 in the preImage while setting up username', async () => {
    //     // sign up and sign in user
    //     const { iden, commitment } = await signUp(t)

    //     // set up username
    //     await setUsername(t, iden, 0, 'test3')

    //     // epoch transition
    //     await new Promise((r) => setTimeout(r, EPOCH_LENGTH))
    //     const prevEpoch = await t.context.unirep.attesterCurrentEpoch(UNIREP_SOCIAL)
    //     await epochTransition(t)
    //     for (;;) {
    //         await new Promise((r) => setTimeout(r, 1000))
    //         const findEpoch = await t.context.db.findOne('Epoch', {
    //             where: { number: Number(prevEpoch) },
    //         })
    //         if (findEpoch) break
    //     }

    //     // user state transition
    //     await userStateTransition(t, iden)

    //     try {
    //         await setUsername(t, iden, 0, 'test4')
    //         t.fail('pass 0 as preImage and succeed')
    //     } catch (e) {
    //         t.pass('reset username should pass previous username in')
    //     }
    // })

    it('after setting up username and get reputation, the user can still do actions after user state transition', async () => {
        const { iden: iden1 } = await signUp(t)
        const { iden: iden2 } = await signUp(t)

        // post subsidy
        const { post: post1 } = await createPostSubsidy(t, iden1)
        // set up username
        await setUsername(t, iden1, 0, 'test5')

        // vote
        {
            const upvote = 5
            const downvote = 0
            const receiver = post1.epochKey.toString()
            await voteSubsidy(
                t,
                iden2,
                receiver,
                post1._id,
                true,
                upvote,
                downvote
            )
        }
        await userStateTransition(t, iden1)

        // user1 make post
        try {
            await createPostSubsidy(t, iden1)
            expect(true).to.be.true
        } catch (e) {
            console.log(e)
            expect(false, 'fail to create a post after ust').to.be.true
        }
    })
})
