import { CircuitConfig } from '@unirep/circuits'
const {
    STATE_TREE_DEPTH,
    EPOCH_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    FIELD_COUNT,
    SUM_FIELD_COUNT,
} = CircuitConfig.default
import { REP_BUDGET } from '@unirep-social/circuits'

const epochLength = 900 // seconds

const stateTreeDepth = STATE_TREE_DEPTH

const epochTreeDepth = EPOCH_TREE_DEPTH

const maxUsers = 2 ** stateTreeDepth - 1

export const settings = {
    epochLength,
    epochTreeDepth,
    numEpochKeyNoncePerEpoch: NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    maxUsers,
    maxReputationBudget: REP_BUDGET,
    fieldCount: FIELD_COUNT,
    sumFieldCount: SUM_FIELD_COUNT,
}
