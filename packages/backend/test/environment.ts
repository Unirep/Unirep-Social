import { ethers } from 'ethers'
import { deployUnirepSocial } from '@unirep-social/core/deploy'
import { deployUnirep } from '@unirep/contracts/deploy'
import { SQLiteMemoryConnector } from 'anondb/node'
import express from 'express'
import cors from 'cors'
import getPort from 'get-port'
import path from 'path'

async function deploy(wallet: ethers.Wallet, overrides = {}) {
    const unirep = await deployUnirep(wallet)
    const postReputation = 5
    const commentReputation = 3
    // const airdropReputation = 30
    const unirepSocial = await deployUnirepSocial(wallet, unirep.address, {
        postReputation,
        commentReputation,
        // airdropReputation,
        ...overrides,
    })
    await unirepSocial.deployed()
    return { unirep, unirepSocial, provider: wallet.provider }
}

export async function startServer(
    deployer: ethers.Wallet,
    app: any,
    contractOverrides = {}
) {
    const { Prover } = require('../src/daemons/Prover')
    const schema = require('../src/schema').default

    const data = await deploy(deployer, contractOverrides)
    const { unirep, unirepSocial } = data

    Object.assign(process.env, {
        UNIREP: unirep.address,
        UNIREP_SOCIAL: unirepSocial.address,
        DEPLOYER_PRIV_KEY: deployer.privateKey,
        DEFAULT_ETH_PROVIDER_URL: 'http://127.0.0.1:8545',
        ...process.env,
    })

    const constants = require('../src/constants')
    const txManager = require('../src/daemons/TransactionManager').default
    const { UnirepSocialSynchronizer } = require('../src/Synchronizer')

    const db = await SQLiteMemoryConnector.create(schema)
    txManager.configure(deployer, db)
    await txManager.start()

    const sync = new UnirepSocialSynchronizer({
        db,
        prover: Prover,
        provider: deployer.provider,
        unirepAddress: unirep.address,
        unirepSocialAddress: unirepSocial.address,
    })
    await sync.start()

    app.use(cors())
    app.use('/build', express.static(path.join(__dirname, '../keys')))
    app.use(express.json())
    app.use('/api', (req, _, next) => {
        // put a db object for use in the route handler
        ;(req as any).db = db
        ;(req as any).unirep = unirep
        ;(req as any).unirepSocial = unirepSocial
        next()
    })
    require('not-index')([__dirname, '../src/routes'], /[a-zA-Z0-9]\.ts/).map(
        (r) => r.default(app)
    )
    // make server app handle any error
    const port = await getPort()

    const url = `http://127.0.0.1:${port}`
    const attesterId = BigInt(unirepSocial.address).toString()
    await new Promise((r) => app.listen(port, r as any))

    return {
        ...data,
        constants,
        db,
        txManager,
        url,
        attesterId,
        app,
    }
}
