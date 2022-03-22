import dotenv from 'dotenv'
import * as config from '@unirep/unirep'

dotenv.config({
    path: '.env',
})

// const DEFAULT_ETH_PROVIDER = `wss://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`
const DEFAULT_PRIVATE_KEY = process.env.PRIVATE_KEY
const DEFAULT_ETH_PROVIDER = 'http://localhost:8545'
const DEFAULT_MAX_EPOCH_KEY_NONCE = config.numEpochKeyNoncePerEpoch
const DEFAULT_EPOCH_LENGTH = config.epochLength
const DEFAULT_ATTESTING_FEE = config.attestingFee
const DEFAULT_TREE_DEPTHS_CONFIG = 'circuit'

export {
    DEFAULT_PRIVATE_KEY,
    DEFAULT_ETH_PROVIDER,
    DEFAULT_MAX_EPOCH_KEY_NONCE,
    DEFAULT_EPOCH_LENGTH,
    DEFAULT_ATTESTING_FEE,
    DEFAULT_TREE_DEPTHS_CONFIG,
}
