import { deployUnirep } from '@unirep/contracts/deploy/index.js'
import { deployUnirepSocial } from '@unirep-social/core/deploy'
import { ethers } from 'ethers'

const HARDHAT_URL = 'http://127.0.0.1:18545'
const FUNDED_PRIVATE_KEY =
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

async function waitForHardhat() {
    for (let x = 0; x < 100; x++) {
        await new Promise((r) => setTimeout(r, 1000))
        try {
            const provider = new ethers.providers.JsonRpcProvider(HARDHAT_URL)
            await provider.getNetwork()
            break
        } catch (_) {}
    }
}

await waitForHardhat()
const provider = new ethers.providers.JsonRpcProvider(HARDHAT_URL)
await provider.getNetwork()
const wallet = new ethers.Wallet(FUNDED_PRIVATE_KEY, provider)

const unirep = await deployUnirep(wallet)

const unirepSocial = await deployUnirepSocial(wallet, unirep.address)
console.log('Unirep: ', unirep.address)
console.log('Unirep Social: ', unirepSocial.address)
