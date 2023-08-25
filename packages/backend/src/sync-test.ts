import { config } from 'dotenv'
config()
import { UnirepSocialSynchronizer } from './Synchronizer'
import { SQLiteMemoryConnector } from 'anondb/node'
import schema from './schema'
import { Prover } from './daemons/Prover'
import { UNIREP, UNIREP_SOCIAL, DEFAULT_ETH_PROVIDER } from './constants'
;(async () => {
    const db = await SQLiteMemoryConnector.create(schema)
    const s = new UnirepSocialSynchronizer({
        db,
        unirepAddress: UNIREP,
        unirepSocialAddress: UNIREP_SOCIAL,
        provider: DEFAULT_ETH_PROVIDER,
    })
    await s.start()
})()
