import test from 'ava'
import { startServer } from './environment'

const EPOCH_LENGTH = 20000

test.before(async (t: any) => {
    const context = await startServer({ epochLength: EPOCH_LENGTH / 1000 })
    Object.assign(t.context, context)
})

test.serial('should use EpochManager to epoch transition', async (t: any) => {
    const { EpochManager } = require('../src/daemons/EpochManager')
    const { unirep } = t.context
    const startEpoch = (await unirep.currentEpoch()).toNumber()
    const epochManager = new EpochManager()
    const waitTime = await epochManager.updateWatch()
    t.assert(waitTime < EPOCH_LENGTH)
    t.assert(waitTime >= 0)
    for (;;) {
        await new Promise((r) => setTimeout(r, waitTime + 10000))
        const currentEpoch = await unirep.currentEpoch()
        if (currentEpoch.toNumber() !== startEpoch + 1) continue
        t.is(currentEpoch.toNumber(), startEpoch + 1)
        break
    }
})
