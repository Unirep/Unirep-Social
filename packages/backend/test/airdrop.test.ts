import test from 'ava'
import { startServer } from './environment'

import {
    airdrop,
    createPost,
    createPostSubsidy,
    epochTransition,
    signUp,
    userStateTransition,
    vote,
} from './utils'

const airdropReputation = 7

test.before(async (t: any) => {
    const context = await startServer({
        airdropReputation,
        epochLength: 100,
    })
    Object.assign(t.context, context)
})

test('should get negative reputation airdrop', async (t: any) => {
    // sign up first user
    const user1 = await signUp(t)

    // first create a post
    const { post } = await createPost(t, user1.iden)

    // sign up second user
    const user2 = await signUp(t)

    // downvote the post
    const upvote = 0
    const downvote = 7
    const receiver = post.epochKey.toString()
    await vote(t, user2.iden, receiver, post._id, true, upvote, downvote)

    // user state transition
    {
        await epochTransition(t)
        // user state transition
        await userStateTransition(t, user1.iden)
    }

    // user prove airdrop
    const postReputation = (
        await t.context.unirepSocial.postReputation()
    ).toNumber()
    await airdrop(t, user1.iden, postReputation + downvote - airdropReputation)

    // user state transition
    {
        await epochTransition(t)
        // user state transition
        await userStateTransition(t, user1.iden)
    }

    // user can post in the 3rd epoch
    await createPostSubsidy(t, user1.iden)
    t.pass()
})
