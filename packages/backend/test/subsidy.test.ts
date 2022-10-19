import test from 'ava'
import { startServer } from './environment'

import { createPostSubsidy, signUp } from './utils'

test.before(async (t: any) => {
    const context = await startServer({
        airdropReputation: 0,
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
