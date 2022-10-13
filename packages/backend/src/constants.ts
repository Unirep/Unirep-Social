import UnirepSocial from '@unirep-social/core/abi/UnirepSocial.json'
import Unirep from '@unirep/contracts/abi/Unirep.json'
import { ethers } from 'ethers'
import { NUM_EPOCH_KEY_NONCE_PER_EPOCH } from '@unirep/circuits'

// Provide default values for process.env
Object.assign(process.env, {
    UNIREP: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
    UNIREP_SOCIAL: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
    DEFAULT_ETH_PROVIDER_URL: 'http://localhost:8545',
    DB_PATH: ':memory:',
    ...process.env,
})

export const {
    DEPLOYER_PRIV_KEY,
    UNIREP,
    UNIREP_SOCIAL,
    DEFAULT_ETH_PROVIDER_URL,
    ALCHEMY_KEY,
    MONGO_URL,
    DB_PATH,
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    TWITTER_CLIENT_ID,
    TWITTER_CLIENT_SECRET,
    TWITTER_REDIRECT_URI,
    GITHUB_REDIRECT_URI,
} = process.env as any

if (!DEPLOYER_PRIV_KEY) {
    console.error('No DEPLOYER_PRIV_KEY specified')
    process.exit(1)
}

// export const UNIREP = '0xE7709F35fb195E1D117D486aEB24bA58CEccCD29';
// export const UNIREP_SOCIAL = '0x0F50453236B2Ca88D5C1fBC8D7FA91001d93eC68';
// const DEFAULT_ETH_PROVIDER_URL = 'wss://eth-goerli.alchemyapi.io/v2/tYp-IJU_idg28iohx9gsLqhq6KRZxk7f';
let DEFAULT_ETH_PROVIDER: any
if (ALCHEMY_KEY) {
    DEFAULT_ETH_PROVIDER = new ethers.providers.AlchemyProvider(
        'optimism-goerli',
        ALCHEMY_KEY
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
export { DEFAULT_ETH_PROVIDER }
export const DEFAULT_START_BLOCK = 0
export const UNIREP_SOCIAL_ATTESTER_ID = 1

export const DEFAULT_POST_KARMA = 5
export const DEFAULT_COMMENT_KARMA = 3
export const MAX_KARMA_BUDGET = 10
export const DEFAULT_AIRDROPPED_KARMA = 30
export const DEFAULT_USERNAME_KARMA = 0
export const DEFAULT_QUERY_DEPTH = 5
export const QUERY_DELAY_TIME = 300
export const EPOCH_KEY_NONCE_PER_EPOCH = NUM_EPOCH_KEY_NONCE_PER_EPOCH

export const maxReputationBudget = 10

export const LOAD_POST_COUNT = 10

export const UNIREP_ABI = Unirep
export const UNIREP_SOCIAL_ABI = UnirepSocial

export enum QueryType {
    New = 'new',
    Boost = 'boost',
    Comments = 'comments',
    Squash = 'squash',
    Rep = 'rep',
}

export const add0x = (str: string): string => {
    str = str.padStart(64, '0')
    return str.startsWith('0x') ? str : '0x' + str
}
