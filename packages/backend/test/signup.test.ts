import test from 'ava'
import { startServer } from './environment'
import fetch from 'node-fetch'

import { airdrop, getInvitationCode, signIn, signUp } from './utils'

test.before(async (t: any) => {
    const context = await startServer()
    Object.assign(t.context, context)
})

test('should get signup code', async (t: any) => {
    let signupCode: string = await getInvitationCode(t)
    const r = await fetch(
        `${t.context.url}/api/genInvitationCode/${signupCode}`
    )
    t.is(r.status, 200)
    t.pass()
})

test('should sign up', async (t: any) => {
    await signUp(t)
    t.pass()
})

test('should airdrop', async (t: any) => {
    const { iden } = await signUp(t)
    await airdrop(t, iden)
    t.pass()
})

test('should sign up many in parallel', async (t: any) => {
    const promises = [] as Promise<any>[]
    for (let x = 0; x < 10; x++) {
        promises.push(signUp(t))
    }
    await Promise.all(promises)
    t.pass()
})

test('should sign in', async (t: any) => {
    const { commitment } = await signUp(t)
    await signIn(t, commitment)
    t.pass()
})
