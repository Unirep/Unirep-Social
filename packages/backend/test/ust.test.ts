import test from 'ava'
import { startServer } from './environment'

import { signUp, userStateTransition } from './utils'

// Milliseconds
const EPOCH_LENGTH = 20000

test.before(async (t: any) => {
    const context = await startServer({ epochLength: EPOCH_LENGTH / 1000 })
    Object.assign(t.context, context)
})

test('should do user state transition', async (t: any) => {
    // sign up user
    const { iden } = await signUp(t)

    const prevEpoch = await t.context.unirep.currentEpoch()
    const { EpochManager } = require('../src/daemons/EpochManager')

    const epochManager = new EpochManager()
    await epochManager.updateWatch()
    // wait for epoch transition
    for (;;) {
        const currentEpoch = await t.context.unirep.currentEpoch()
        if (+currentEpoch === +prevEpoch + 1) break
        await new Promise((r) => setTimeout(r, 1000))
    }
    epochManager.stop()
    // user state transition
    await userStateTransition(t, iden)
    t.pass()
})
