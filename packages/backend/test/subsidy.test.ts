import test from 'ava'
import { startServer } from './environment'

import { createCommentSubsidy, createPostSubsidy, signUp } from './utils'

test.before(async (t: any) => {
    const context = await startServer({
        airdropReputation: 0,
        epkSubsidy: 9,
        epochLength: 100,
    })
    Object.assign(t.context, context)
})

test('should create post with subsidy', async (t: any) => {
    // sign up user
    const { iden } = await signUp(t)

    // post subsidy
    await createPostSubsidy(t, iden)
    t.pass()
})

test('should create comment with subsidy', async (t: any) => {
    // sign up user
    const { iden } = await signUp(t)

    // post subsidy
    const { post } = await createPostSubsidy(t, iden)

    // coment subsidy
    await createCommentSubsidy(t, iden, post._id)
    t.pass()
})

test('should not post with too much subsidy', async (t: any) => {
    // sign up user
    const { iden } = await signUp(t)

    // post subsidy
    await createPostSubsidy(t, iden)
    try {
        await createPostSubsidy(t, iden)
        t.fail()
    } catch (_) {
        t.pass()
    }
})

test('should not comment with too much subsidy', async (t: any) => {
    // sign up user
    const { iden } = await signUp(t)

    // post subsidy
    const { post } = await createPostSubsidy(t, iden)

    // coment subsidy
    await createCommentSubsidy(t, iden, post._id)
    try {
        await createCommentSubsidy(t, iden, post._id)
        t.fail()
    } catch (_) {
        t.pass()
    }
})
