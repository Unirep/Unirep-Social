import test from 'ava'
import { startServer } from './environment'
import fetch from 'node-fetch'

import { signIn, signUp, setUsername } from './utils'

test.before(async (t: any) => {
    const context = await startServer()
    Object.assign(t.context, context)
})

test('should set a username', async (t: any) => {
    // sign up and sign in user
    const { iden, commitment } = await signUp(t)
    await signIn(t, commitment)

    // first set a username
    await setUsername(t, iden)
    t.pass()
})
