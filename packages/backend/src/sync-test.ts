import { config } from 'dotenv'
config()
import { UnirepSocialSynchronizer } from '@unirep-social/core'
import { SQLiteMemoryConnector } from 'anondb/node'
import schema from './schema'
import { Prover } from './daemons/Prover'
import { ethers } from 'ethers'
import {
    UNIREP,
    UNIREP_ABI,
    UNIREP_SOCIAL,
    UNIREP_SOCIAL_ABI,
    DEFAULT_ETH_PROVIDER,
} from './constants'
;(async () => {
    const db = await SQLiteMemoryConnector.create(schema)
    const s = new UnirepSocialSynchronizer(
        db,
        Prover,
        new ethers.Contract(UNIREP, UNIREP_ABI, DEFAULT_ETH_PROVIDER),
        new ethers.Contract(
            UNIREP_SOCIAL,
            UNIREP_SOCIAL_ABI,
            DEFAULT_ETH_PROVIDER
        )
    )
    await s.start()
})()
