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
    await epochTransition(t)

    // user state transition
    await userStateTransition(t, iden)

    // change the username to something else
    try {
        await setUsername(
            t,
            iden,
            'initial-test-username123',
            'second-test-username123'
        )
        t.pass('pass the test!')
    } catch (e) {
        t.fail('set username failed with error ' + e)
    }
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
        await epochTransition(t)

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

test.serial('should fail to set with invalid proof', async (t: any) => {
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

    // epoch transition and ust
    await epochTransition(t)
    await userStateTransition(t, iden)

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

test.serial('should be able to use unused username', async (t: any) => {
    // sign up
    const { iden, commitment } = await signUp(t)

    // set username to test1
    console.log('set username from 0 to test1')
    await setUsername(t, iden, 0, 'test1')
    await epochTransition(t)
    await userStateTransition(t, iden)

    // set username to test2
    console.log('set username from test1 to test2')
    await setUsername(t, iden, 'test1', 'test2')
    await epochTransition(t)
    await userStateTransition(t, iden)

    // set username to test1 again
    try {
        console.log('set username from test2 to test1')
        await setUsername(t, iden, 'test2', 'test1')
        t.pass('successfully set unused username')
    } catch (e) {
        t.fail('fail to set unused username: ' + e)
    }
})

test.serial(
    'if preImage is wrong, not able to set new username',
    async (t: any) => {
        // sign up
        const { iden, commitment } = await signUp(t)

        // set username to test3
        await setUsername(t, iden, 0, 'test3')
        await epochTransition(t)
        await userStateTransition(t, iden)

        // try to set username from test_wrong to test4 before ust
        try {
            await setUsername(t, iden, 'test_wrong', 'test4')
            t.fail('set preImage as test_wrong successfully')
        } catch (e) {
            t.pass('set preImage as test_wrong failed')
        }
    }
)

test.serial(
    'cannot set username multiple times in an epoch',
    async (t: any) => {
        // sign up
        const { iden, commitment } = await signUp(t)

        // set username to test5
        await setUsername(t, iden, 0, 'test5')

        // set username to test6
        try {
            await setUsername(t, iden, 0, 'test6')
            t.fail('should not allow user to set username twice')
        } catch (e) {
            t.pass('should fail to set username twice or more')
        }
    }
)
