import test from 'ava'
import { startServer } from './environment'

import { epochTransition, signUp, userStateTransition } from './utils'

// Milliseconds
const EPOCH_LENGTH = 20000

test.before(async (t: any) => {
    const context = await startServer({ epochLength: EPOCH_LENGTH / 1000 })
    Object.assign(t.context, context)
})

test('should do user state transition', async (t: any) => {
    // sign up user
    const { iden } = await signUp(t)

    await epochTransition(t)
    // user state transition
    await userStateTransition(t, iden)
    t.pass()
})
