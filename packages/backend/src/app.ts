import express from 'express'
import path from 'path'
import cors from 'cors'
import dotenv from 'dotenv'
// load the environment variables from the .env file before constants file
dotenv.config()
import TransactionManager from './daemons/TransactionManager'
import { SQLiteConnector } from 'anondb/node'
import { UnirepSocialSynchronizer } from './Synchronizer'
import schema from './schema'
import {
    UNIREP,
    UNIREP_SOCIAL,
    DEPLOYER_PRIV_KEY,
    DEFAULT_ETH_PROVIDER,
    DB_PATH,
} from './constants'
import { ethers } from 'ethers'

main().catch((err) => {
    console.log(`Uncaught error: ${err}`)
    process.exit(1)
})
async function main() {
    const db = await SQLiteConnector.create(schema, DB_PATH)
    // start watching for epoch transitions
    const wallet = new ethers.Wallet(DEPLOYER_PRIV_KEY, DEFAULT_ETH_PROVIDER)
    TransactionManager.configure(wallet, db)
    await TransactionManager.start()
    const sync = new UnirepSocialSynchronizer({
        db,
        unirepAddress: UNIREP,
        unirepSocialAddress: UNIREP_SOCIAL,
        provider: DEFAULT_ETH_PROVIDER,
    })
    await sync.start()

    const attesterId = BigInt(UNIREP_SOCIAL).toString()
    const epochLength = await sync.unirepContract.attesterEpochLength(
        attesterId
    )
    const startTimestamp = (
        await sync.unirepContract.attesterStartTimestamp(attesterId)
    ).toNumber()
    const { postReputation, commentReputation, subsidy, maxReputationBudget } =
        sync.socialConfig
    const {
        sumFieldCount,
        fieldCount,
        stateTreeDepth,
        epochTreeDepth,
        numEpochKeyNoncePerEpoch,
    } = sync.settings

    await db.upsert('Config', {
        where: {
            attesterId,
        },
        create: {
            attesterId,
            postReputation,
            commentReputation,
            subsidy,
            maxReputationBudget,
            epochLength,
            startTimestamp,
            stateTreeDepth,
            epochTreeDepth,
            fieldCount,
            sumFieldCount,
            numEpochKeyNoncePerEpoch,
        },
        update: {},
    })

    // now start the http server
    const app = express()
    app.use(cors())
    app.use('/build', express.static(path.join(__dirname, '../keys')))
    app.use(express.json())
    app.use('/api', (req, _, next) => {
        // put a db object for use in the route handler
        ;(req as any).db = db
        ;(req as any).unirep = sync.unirepContract
        ;(req as any).unirepSocial = sync.unirepSocialContract
        next()
    })
    require('not-index')([__dirname, 'routes'], /[a-zA-Z0-9]\.ts/).map((r) =>
        r.default(app)
    )
    const port = process.env.APP_PORT ?? 3001
    app.listen(port, () => console.log(`> Listening on port ${port}`))
}
