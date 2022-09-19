import test from 'ava'
import { startServer } from './environment'
import fetch from 'node-fetch'
import { hashOne } from '@unirep/crypto'
import { ethers } from 'ethers'

import {
    signIn,
    signUp,
    setUsername,
    epochTransition,
    userStateTransition,
    setSameUsername,
} from './utils'

const EPOCH_LENGTH = 20000

test.before(async (t: any) => {
    const context = await startServer({ epochLength: EPOCH_LENGTH / 1000 })
    Object.assign(t.context, context)
})

test('should set a username', async (t: any) => {
    // sign up and sign in user
    const { iden, commitment } = await signUp(t)
    await signIn(t, commitment)

    // first set a username
    // pre-image by default is 0
    console.log('setusername1')
    await setUsername(t, iden, 0, 'initial-test-username123')

    await new Promise((r) => setTimeout(r, EPOCH_LENGTH))

    // execute the epoch transition
    const prevEpoch = await t.context.unirep.currentEpoch()
    await epochTransition(t)
    for (;;) {
        await new Promise((r) => setTimeout(r, 1000))
        const findEpoch = await t.context.db.findOne('Epoch', {
            where: { number: Number(prevEpoch) },
        })
        if (findEpoch) break
    }

    // user state transition
    await userStateTransition(t, iden)

    // change the username to something else
    console.log('setusername2')
    await setUsername(
        t,
        iden,
        'initial-test-username123',
        'second-test-username123'
    )

    t.pass()
})

test('should fail to set the username that is already taken', async (t: any) => {
    // sign up and sign in user
    const { iden, commitment } = await signUp(t)
    await signIn(t, commitment)

    // first set a username
    // pre-image by default is 0
    console.log('setusername3')
    await setUsername(t, iden, 0, 'username123')

    await new Promise((r) => setTimeout(r, EPOCH_LENGTH))

    // execute the epoch transition
    const prevEpoch = await t.context.unirep.currentEpoch()
    await epochTransition(t)
    for (;;) {
        await new Promise((r) => setTimeout(r, 1000))
        const findEpoch = await t.context.db.findOne('Epoch', {
            where: { number: Number(prevEpoch) },
        })
        if (findEpoch) break
    }

    // user state transition
    await userStateTransition(t, iden)

    // try to change the username to the same one
    console.log('setusername4')
    const result = await setSameUsername(t, iden, 'username123', 'username123')
})
