import {
    NUM_ATTESTATIONS_PER_PROOF,
    MAX_REPUTATION_BUDGET,
    USER_STATE_TREE_DEPTH,
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
} from '@unirep/circuits'

export const circuitContents = {
    proveNegativeReputation: `include "../circuits/proveNegativeReputation.circom" \n\ncomponent main = ProveNegativeReputation(${GLOBAL_STATE_TREE_DEPTH}, ${USER_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, 252)`,
    proveSubsidyKey: `include "../circuits/proveSubsidyKey.circom" \n\ncomponent main = ProveSubsidyKey(${GLOBAL_STATE_TREE_DEPTH}, ${USER_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, 252)`,
    proveGraffitiPreimage: `include "../circuits/proveGraffitiPreimage.circom" \n\ncomponent main = ProveGraffitiPreimage(${GLOBAL_STATE_TREE_DEPTH}, ${USER_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH})`,
}
