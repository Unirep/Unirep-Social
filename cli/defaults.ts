import dotenv from 'dotenv'
import * as config from '@unirep/config'

dotenv.config({
    path: '.env',
})

// const DEFAULT_ETH_PROVIDER = `wss://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`
const DEFAULT_PRIVATE_KEY = process.env.PRIVATE_KEY
const DEFAULT_ETH_PROVIDER = 'http://localhost:8545'
const DEFAULT_MAX_EPOCH_KEY_NONCE = config.NUM_EPOCH_KEY_NONCE_PER_EPOCH
const DEFAULT_EPOCH_LENGTH = config.EPOCH_LENGTH
const DEFAULT_ATTESTING_FEE = config.ATTESTTING_FEE

export {
    DEFAULT_PRIVATE_KEY,
    DEFAULT_ETH_PROVIDER,
    DEFAULT_MAX_EPOCH_KEY_NONCE,
    DEFAULT_EPOCH_LENGTH,
    DEFAULT_ATTESTING_FEE,
}
