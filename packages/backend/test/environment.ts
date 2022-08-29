import { ethers } from 'ethers'
import UnirepSocial from '@unirep-social/core/artifacts/contracts/UnirepSocial.sol/UnirepSocial.json'
import { deployUnirep } from '@unirep/contracts/deploy'
import express from 'express'
import cors from 'cors'
import getPort from 'get-port'
import { SQLiteConnector, SQLiteMemoryConnector } from 'anondb/node'
import schema from '../src/schema'
import { Prover } from '../src/daemons/Prover'

import { settings } from './config'

const sharedDB = SQLiteConnector.create(schema, `testdb.sqlite`)

// const GANACHE_URL = 'https://hardhat.unirep.social'
const GANACHE_URL = 'http://127.0.0.1:18545'
const FUNDED_PRIVATE_KEY =
    '0x0000000000000000000000000000000000000000000000000000000000000001'

async function waitForGanache() {
    for (let x = 0; x < 100; x++) {
        await new Promise((r) => setTimeout(r, 1000))
        try {
            const provider = new ethers.providers.JsonRpcProvider(GANACHE_URL)
            await provider.getNetwork()
            break
        } catch (_) {}
    }
}

async function deploy(wallet: ethers.Wallet, overrides = {}) {
    const provider = new ethers.providers.JsonRpcProvider(GANACHE_URL)
    const unirep = await deployUnirep(wallet, {
        epochLength: settings.epochLength,
        ...overrides,
    })
    const UnirepSocialF = new ethers.ContractFactory(
        UnirepSocial.abi,
        UnirepSocial.bytecode,
        wallet
    )
    const postReputation = 5
    const commentReputation = 3
    const airdrop = 30
    const unirepSocial = await UnirepSocialF.deploy(
        unirep.address,
        postReputation,
        commentReputation,
        airdrop
    )
    await unirepSocial.deployed()
    return { unirep, unirepSocial, provider }
}

export async function startServer(contractOverrides = {}) {
    await waitForGanache()

    const { TransactionManager } = require('../src/daemons/TransactionManager')

    const provider = new ethers.providers.JsonRpcProvider(GANACHE_URL)
    // this is the global manager shared across test processes
    const txManager = new TransactionManager()
    txManager.configure(FUNDED_PRIVATE_KEY, provider, await sharedDB)
    await txManager.start()

    const wallet = ethers.Wallet.createRandom().connect(provider)

    // now fund our fresh wallet
    const hash = await txManager.queueTransaction(wallet.address, {
        value: ethers.BigNumber.from(10).pow(20), // 100 eth
    })
    await provider.waitForTransaction(hash)

    const data = await deploy(wallet, contractOverrides)
    const { unirep, unirepSocial } = data

    Object.assign(process.env, {
        UNIREP: unirep.address,
        UNIREP_SOCIAL: unirepSocial.address,
        DEPLOYER_PRIV_KEY: wallet.privateKey,
        DEFAULT_ETH_PROVIDER_URL: GANACHE_URL,
        ADMIN_SESSION_CODE: 'ffff',
        ...process.env,
    })

    const constants = require('../src/constants')
    const appTxManager = require('../src/daemons/TransactionManager').default
    const { UnirepSocialSynchronizer } = require('@unirep-social/core')

    const appDB = await SQLiteMemoryConnector.create(schema)
    appTxManager.configure(wallet.privateKey, provider, appDB)
    await appTxManager.start()

    const sync = new UnirepSocialSynchronizer(
        appDB,
        Prover,
        unirep as any,
        unirepSocial as any
    )
    await sync.start()

    const app = express()
    app.use(cors())
    app.use(express.json())
    app.use('/api', (req, _, next) => {
        // put a db object for use in the route handler
        ;(req as any).db = appDB
        next()
    })
    require('not-index')(
        [__dirname, '../src/routes'],
        /[a-zA-Z0-9]\.(ts|js)/
    ).map((r) => r.default(app))
    // make server app handle any error
    const port = await getPort()
    const url = `http://127.0.0.1:${port}`
    const attesterId = BigInt(
        (await unirep.attesters(unirepSocial.address)).toNumber()
    )
    await new Promise((r) => app.listen(port, r as any))
    return { ...data, constants, url, attesterId, db: appDB }
}
