import test from 'ava'
import { startServer } from './environment'
import fetch from 'node-fetch'

const EPOCH_LENGTH = 20000

test.before(async (t: any) => {
    const context = await startServer({ epochLength: EPOCH_LENGTH / 1000 })
    Object.assign(t.context, context)
})

test.serial('should use api to epoch transition', async (t: any) => {
    await new Promise((r) => setTimeout(r, EPOCH_LENGTH))
    const r = await fetch(`${t.context.url}/api/epochTransition`, {
        method: 'POST',
        headers: {
            authorization: 'NLmKDUnJUpc6VzuPc7Wm',
        },
    })
    t.is(r.status, 204)
})

test.serial('should use EpochManager to epoch transition', async (t: any) => {
    const { EpochManager } = require('../src/daemons/EpochManager')
    const { unirep } = t.context
    const startEpoch = (await unirep.currentEpoch()).toNumber()
    const epochManager = new EpochManager()
    const waitTime = await epochManager.updateWatch()
    t.assert(waitTime < EPOCH_LENGTH)
    t.assert(waitTime >= 0)
    await new Promise((r) => setTimeout(r, waitTime + 10000))
    const currentEpoch = await unirep.currentEpoch()
    t.is(currentEpoch.toNumber(), startEpoch + 1)
})
