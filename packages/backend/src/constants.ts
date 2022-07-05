import UnirepSocial from 'unirep-social/artifacts/contracts/UnirepSocial.sol/UnirepSocial.json'
import Unirep from '@unirep/contracts/artifacts/contracts/Unirep.sol/Unirep.json'
import { ethers } from 'ethers'
import randomstring from 'randomstring'
import { NUM_EPOCH_KEY_NONCE_PER_EPOCH } from '@unirep/circuits/config'

// Provide default values for process.env
Object.assign(process.env, {
    UNIREP: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
    UNIREP_SOCIAL: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
    DEFAULT_ETH_PROVIDER_URL: 'http://localhost:8545',
    ADMIN_SESSION_CODE: randomstring.generate(20),
    DB_PATH: ':memory:',
    ...process.env,
})

export const {
    DEPLOYER_PRIV_KEY,
    UNIREP,
    UNIREP_SOCIAL,
    DEFAULT_ETH_PROVIDER_URL,
    MONGO_URL,
    ADMIN_SESSION_CODE,
    DB_PATH,
} = process.env as any

console.log(`Admin session code is "${ADMIN_SESSION_CODE}"`)

if (!DEPLOYER_PRIV_KEY) {
    console.error('No DEPLOYER_PRIV_KEY specified')
    process.exit(1)
}

// export const UNIREP = '0xE7709F35fb195E1D117D486aEB24bA58CEccCD29';
// export const UNIREP_SOCIAL = '0x0F50453236B2Ca88D5C1fBC8D7FA91001d93eC68';
// const DEFAULT_ETH_PROVIDER_URL = 'wss://eth-goerli.alchemyapi.io/v2/tYp-IJU_idg28iohx9gsLqhq6KRZxk7f';
export const DEFAULT_ETH_PROVIDER = DEFAULT_ETH_PROVIDER_URL.startsWith('http')
    ? new ethers.providers.JsonRpcProvider(DEFAULT_ETH_PROVIDER_URL)
    : new ethers.providers.WebSocketProvider(DEFAULT_ETH_PROVIDER_URL)
export const DEFAULT_START_BLOCK = 0
export const UNIREP_SOCIAL_ATTESTER_ID = 1

export const DEFAULT_POST_KARMA = 5
export const DEFAULT_COMMENT_KARMA = 3
export const MAX_KARMA_BUDGET = 10
export const DEFAULT_AIRDROPPED_KARMA = 30
export const DEFAULT_QUERY_DEPTH = 5
export const QUERY_DELAY_TIME = 300
export const EPOCH_KEY_NONCE_PER_EPOCH = NUM_EPOCH_KEY_NONCE_PER_EPOCH

export const maxReputationBudget = 10

export const LOAD_POST_COUNT = 10

export const UNIREP_ABI = Unirep.abi
export const UNIREP_SOCIAL_ABI = UnirepSocial.abi

export enum QueryType {
    New = 'new',
    Boost = 'boost',
    Comments = 'comments',
    Squash = 'squash',
    Rep = 'rep',
}

export const titlePrefix = '<t>'
export const titlePostfix = '</t>'

export const add0x = (str: string): string => {
    str = str.padStart(64, '0')
    return str.startsWith('0x') ? str : '0x' + str
}
