// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import '@testing-library/cypress/add-commands'
import './commands'
import { ethers } from 'ethers'

// import unirep social json abi
import UnirepSocial from '@unirep-social/core/artifacts/contracts/UnirepSocial.sol/UnirepSocial.json'
import { deployUnirep } from '@unirep/contracts'

const GANACHE_URL = 'http://127.0.0.1:18545'
const FUNDED_PRIVATE_KEY =
    '0x0000000000000000000000000000000000000000000000000000000000000001'
// chain id is 1337 for ganache RPC provider
const provider = new ethers.providers.JsonRpcProvider(GANACHE_URL)

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
    console.log('deploying unirep in e2e')
    const provider = new ethers.providers.JsonRpcProvider(GANACHE_URL)
    const unirep = await deployUnirep(wallet)
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
    console.log('This is unirepSocial deployed', unirepSocial)
    await unirepSocial.deployed()
    return { unirep, unirepSocial, provider }
}

export async function startServer(contractOverrides = {}) {
    console.log('start server function in e2e')
    await waitForGanache()

    // const { TransactionManager } = require('../../../backend/src/daemons/transaction-manager')

    const provider = new ethers.providers.JsonRpcProvider(GANACHE_URL)
    // this is the global manager shared across test processes
    // const txManager = new TransactionManager()
    // txManager.configure(FUNDED_PRIVATE_KEY, provider)
    // await txManager.start()

    const wallet = ethers.Wallet.createRandom().connect(provider)
    // now fund our fresh wallet
    // const hash = await txManager.queueTransaction(wallet.address, {
    //     value: ethers.BigNumber.from(10).pow(20), // 100 eth
    // })
    // await provider.waitForTransaction(hash)

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

    return { ...data }
}
