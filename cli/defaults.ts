import { attestingFee, epochLength, numEpochKeyNoncePerEpoch } from '@unirep/unirep'
// import { ALCHEMY_API_KEY } from '../privateKey'

// const DEFAULT_ETH_PROVIDER = `https://eth-goerli.alchemyapi.io/v2/${ALCHEMY_API_KEY}`
const DEFAULT_ETH_PROVIDER = 'http://localhost:8545'
const DEFAULT_MAX_EPOCH_KEY_NONCE = numEpochKeyNoncePerEpoch
const DEFAULT_EPOCH_LENGTH = epochLength
const DEFAULT_ATTESTING_FEE = attestingFee
const DEFAULT_TREE_DEPTHS_CONFIG = 'circuit'

export {
    DEFAULT_ETH_PROVIDER,
    DEFAULT_MAX_EPOCH_KEY_NONCE,
    DEFAULT_EPOCH_LENGTH,
    DEFAULT_ATTESTING_FEE,
    DEFAULT_TREE_DEPTHS_CONFIG,
}