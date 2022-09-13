import test from 'ava'
import { startServer } from './environment'
import fetch from 'node-fetch'
import { hashOne } from '@unirep/crypto'
import { ethers } from 'ethers'

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
    // pre-image by default is 0
    await setUsername(t, iden, 0, 'initial-test-username123')

    // change the username to something else
    await setUsername(
        t,
        iden,
        'initial-test-username123',
        'second-test-username123'
    )

    t.pass()
})
