import { ethers } from 'ethers'
import UnirepSocial from '@unirep-social/core/abi/UnirepSocial.json'
import Unirep from '@unirep/contracts/abi/Unirep.json'

const EXPLORER_URL = 'https://blockscout.com/optimism/goerli'

let config: any = {}
try {
    const TERMINATOR = ''
    const localConfig = require(`./localConfig.ts${TERMINATOR}`)
    Object.assign(config, localConfig.default)
} catch (_) {}
try {
    const localConfig = (window as any).__DEV_CONFIG__
    Object.assign(config, localConfig)
} catch (_) {}

if (process.env.NODE_ENV === 'test' || process.env.CYPRESS) {
    config.SERVER = 'http://testurl.invalidtld'
    config.DEFAULT_ETH_PROVIDER_URL = 'http://localhost:18545'
}

const SERVER = config.SERVER ?? 'http://localhost:3001'
const DEFAULT_ETH_PROVIDER_URL =
    config.DEFAULT_ETH_PROVIDER_URL ?? 'http://localhost:8545'

let DEFAULT_ETH_PROVIDER: any
if (config.ALCHEMY_KEY) {
    DEFAULT_ETH_PROVIDER = new ethers.providers.AlchemyProvider(
        'optimism-goerli',
        config.ALCHEMY_KEY
    )
} else if (DEFAULT_ETH_PROVIDER_URL.startsWith('http')) {
    DEFAULT_ETH_PROVIDER = new ethers.providers.JsonRpcProvider(
        DEFAULT_ETH_PROVIDER_URL
    )
} else if (DEFAULT_ETH_PROVIDER_URL.startsWith('ws')) {
    DEFAULT_ETH_PROVIDER = new ethers.providers.WebSocketProvider(
        DEFAULT_ETH_PROVIDER_URL
    )
} else {
    throw new Error('No eth provider')
}

const UNIREP_SOCIAL_ABI = UnirepSocial
const UNIREP_ABI = Unirep

const ABOUT_URL = 'https://about.unirep.social'
const LOAD_POST_COUNT = 10

const CURRENT_VERSION = config.CURRENT_VERSION ?? 1

export {
    SERVER,
    DEFAULT_ETH_PROVIDER,
    DEFAULT_ETH_PROVIDER_URL,
    UNIREP_ABI,
    UNIREP_SOCIAL_ABI,
    ABOUT_URL,
    LOAD_POST_COUNT,
    EXPLORER_URL,
    CURRENT_VERSION,
}
