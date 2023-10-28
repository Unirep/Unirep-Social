import UnirepSocial from '@unirep-social/core/abi/UnirepSocial.json'
import Unirep from '@unirep/contracts/abi/Unirep.json'
import { ethers } from 'ethers'
import { CircuitConfig } from '@unirep/circuits'
import { REP_BUDGET } from '@unirep-social/circuits'
const { NUM_EPOCH_KEY_NONCE_PER_EPOCH } = CircuitConfig.default

// Provide default values for process.env
Object.assign(process.env, {
    UNIREP: '0xD91ca7eAB8ac0e37681362271DEB11a7fc4e0d4f',
    UNIREP_SOCIAL: '0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1',
    DEFAULT_ETH_PROVIDER_URL: 'http://127.0.0.1:8545',
    DEPLOYER_PRIV_KEY:
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    DB_PATH: ':memory:',
    ...process.env,
})

export const {
    DEPLOYER_PRIV_KEY,
    UNIREP,
    UNIREP_SOCIAL,
    DEFAULT_ETH_PROVIDER_URL,
    MONGO_URL,
    DB_PATH,
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    TWITTER_CLIENT_ID,
    TWITTER_CLIENT_SECRET,
    TWITTER_REDIRECT_URI,
    GITHUB_REDIRECT_URI,
} = process.env as any

// export const UNIREP = '0xE7709F35fb195E1D117D486aEB24bA58CEccCD29';
// export const UNIREP_SOCIAL = '0x0F50453236B2Ca88D5C1fBC8D7FA91001d93eC68';
// const DEFAULT_ETH_PROVIDER_URL = 'wss://eth-goerli.alchemyapi.io/v2/tYp-IJU_idg28iohx9gsLqhq6KRZxk7f';
export const DEFAULT_ETH_PROVIDER = DEFAULT_ETH_PROVIDER_URL.startsWith('http')
    ? new ethers.providers.JsonRpcProvider(DEFAULT_ETH_PROVIDER_URL)
    : new ethers.providers.WebSocketProvider(DEFAULT_ETH_PROVIDER_URL)
export const DEFAULT_START_BLOCK = 0

export const DEFAULT_POST_REP = 5
export const DEFAULT_COMMENT_REP = 3
export const MAX_REP_BUDGET = 10
export const DEFAULT_AIRDROPPED_REP = 30
export const DEFAULT_USERNAME_REP = 0
export const DEFAULT_EPOCH_LENGTH = 15 * 60
export const DEFAULT_SUBSIDY = 30
export const DEFAULT_QUERY_DEPTH = 5
export const QUERY_DELAY_TIME = 300
export const EPOCH_KEY_NONCE_PER_EPOCH = NUM_EPOCH_KEY_NONCE_PER_EPOCH

export const maxReputationBudget = REP_BUDGET

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

export const DELETED_CONTENT: string = '[This has been deleted...]'
export const TITLE_LABEL = '<title>'
