import express from 'express'
import path from 'path'
import cors from 'cors'
import dotenv from 'dotenv'
// load the environment variables from the .env file before constants file
dotenv.config()
import EpochManager from './daemons/EpochManager'
import TransactionManager from './daemons/TransactionManager'
import { UnirepSocialSynchronizer } from '@unirep-social/core'
import { SQLiteConnector } from 'anondb/node'
import schema from './schema'
import { Prover } from './daemons/Prover'
import { ethers } from 'ethers'
import {
    UNIREP,
    UNIREP_ABI,
    UNIREP_SOCIAL,
    UNIREP_SOCIAL_ABI,
    DEPLOYER_PRIV_KEY,
    DEFAULT_ETH_PROVIDER,
    DB_PATH,
} from './constants'

main().catch((err) => {
    console.log(`Uncaught error: ${err}`)
    process.exit(1)
})

async function main() {
    const db = await SQLiteConnector.create(schema, DB_PATH)
    // start watching for epoch transitions
    await EpochManager.updateWatch()
    TransactionManager.configure(DEPLOYER_PRIV_KEY, DEFAULT_ETH_PROVIDER, db)
    await TransactionManager.start()
    const sync = new UnirepSocialSynchronizer(
        db,
        Prover,
        new ethers.Contract(UNIREP, UNIREP_ABI, DEFAULT_ETH_PROVIDER),
        new ethers.Contract(
            UNIREP_SOCIAL,
            UNIREP_SOCIAL_ABI,
            DEFAULT_ETH_PROVIDER
        )
    )
    await sync.start()

    // now start the http server
    const app = express()
    app.use(cors())
    app.use('/build', express.static(path.join(__dirname, '../keys')))
    app.use(express.json())
    app.use('/api', (req, _, next) => {
        // put a db object for use in the route handler
        ;(req as any).db = db
        next()
    })
    require('not-index')([__dirname, 'routes'], /[a-zA-Z0-9]\.ts/).map((r) =>
        r.default(app)
    )
    const port = process.env.APP_PORT ?? 3001
    app.listen(port, () => console.log(`> Listening on port ${port}`))
}
