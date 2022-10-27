import { deployUnirep } from '@unirep/contracts/deploy/index.js'
import { deployUnirepSocial } from '@unirep-social/core'
import { ethers } from 'ethers'

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

await waitForGanache()
const provider = new ethers.providers.JsonRpcProvider(GANACHE_URL)
await provider.getNetwork()
const wallet = new ethers.Wallet(FUNDED_PRIVATE_KEY, provider)

const epochLength = 5 * 60
const unirep = await deployUnirep(wallet, { epochLength })

const postReputation = 5
const commentReputation = 3
const airdropReputation = 30
const unirepSocial = await deployUnirepSocial(wallet, unirep.address, {
    postReputation,
    commentReputation,
    airdropReputation,
})
console.log('Unirep: ', unirep.address)
console.log('Unirep Social: ', unirepSocial.address)