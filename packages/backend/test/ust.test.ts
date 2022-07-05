import test from 'ava'
import { startServer } from './environment'

import { epochTransition, signUp, userStateTransition } from './utils'

const EPOCH_LENGTH = 20000

test.before(async (t: any) => {
    const context = await startServer({ epochLength: EPOCH_LENGTH / 1000 })
    Object.assign(t.context, context)
})

test('should do user state transition', async (t: any) => {
    // sign up user
    const { iden } = await signUp(t)

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
    t.pass()
})
