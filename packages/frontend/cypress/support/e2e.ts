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

import { ethers } from 'ethers'

// import unirep social json abi
import UnirepSocial from '@unirep-social/core/artifacts/contracts/UnirepSocial.sol/UnirepSocial.json'
import { getUnirepContract } from '@unirep/contracts'

const unirepAddress = '0xe69a847CD5BC0C9480adA0b339d7F0a8caC2B667'
const unirepSocialAddress = '0x7758F98C1c487E5653795470eEab6C4698bE541b'
const GANACHE_URL = 'http://localhost:18545'
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

export async function startServer(contractOverrides = {}) {
    console.log('start server function in e2e')
    await waitForGanache()

    const provider = new ethers.providers.JsonRpcProvider(GANACHE_URL)

    const wallet = new ethers.Wallet(FUNDED_PRIVATE_KEY, provider)

    const unirep = getUnirepContract(unirepAddress, wallet)
    const unirepSocial = new ethers.Contract(
        unirepSocialAddress,
        UnirepSocial.abi,
        provider
    )

    // Object.assign(process.env, {
    //     UNIREP: unirep.address,
    //     UNIREP_SOCIAL: unirepSocial.address,
    //     DEPLOYER_PRIV_KEY: wallet.privateKey,
    //     DEFAULT_ETH_PROVIDER_URL: GANACHE_URL,
    //     ADMIN_SESSION_CODE: 'ffff',
    //     ...process.env,
    // })
    // console.log('This is process env:', process.env)

    return {
        unirepSocialAddress: unirepSocial.address,
        unirepAddress: unirep.address,
        unirepSocialABI: UnirepSocial.abi,
        fundedKey: FUNDED_PRIVATE_KEY,
        ganacheUrl: GANACHE_URL,
    }
}
