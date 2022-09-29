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
    waitForBackendBlock,
    genUsernameProof,
} from './utils'

const EPOCH_LENGTH = 20000

test.before(async (t: any) => {
    const context = await startServer({ epochLength: EPOCH_LENGTH / 1000 })
    Object.assign(t.context, context)
})

test.serial('should set a username', async (t: any) => {
    // sign up and sign in user
    const { iden, commitment } = await signUp(t)

    // first set a username
    // pre-image by default is 0
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
    await setUsername(
        t,
        iden,
        'initial-test-username123',
        'second-test-username123'
    )

    t.pass()
})

test.serial(
    'should fail to set the username that is already taken',
    async (t: any) => {
        // sign up and sign in user
        const { iden, commitment } = await signUp(t)

        // first set a username
        // pre-image by default is 0
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
        try {
            await setUsername(t, iden, 'username123', 'username123')
            t.fail()
        } catch (err: any) {
            t.true(err.toString().startsWith('Error: /post error'))
        }
    }
)

test('should fail to set with invalid proof', async (t: any) => {
    // sign up and sign in user
    const { iden, commitment } = await signUp(t)

    // first set a username
    // pre-image by default is 0
    await setUsername(t, iden, 0, 'username456')

    const { proof, publicSignals, blockNumber } = await genUsernameProof(
        t,
        iden,
        0
    )
    await waitForBackendBlock(t, blockNumber)

    // send a invalid proof
    const r = await fetch(`${t.context.url}/api/usernames`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            newUsername: 'username456',
            publicSignals: publicSignals.reverse(),
            proof: proof.reverse(),
        }),
    })

    t.is(r.ok, false)
})
