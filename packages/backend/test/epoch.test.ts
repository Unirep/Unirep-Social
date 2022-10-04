import test from 'ava'
import { startServer } from './environment'
import { epochTransition } from './utils'

const EPOCH_LENGTH = 20000

test.before(async (t: any) => {
    const context = await startServer({ epochLength: EPOCH_LENGTH / 1000 })
    Object.assign(t.context, context)
})

test.serial('should use EpochManager to epoch transition', async (t: any) => {
    await epochTransition(t)
    t.pass()
})
