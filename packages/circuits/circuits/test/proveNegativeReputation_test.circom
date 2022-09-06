include "../proveNegativeReputation.circom";

component main = ProveNegativeReputation(
    9,   // GST_tree_depth
    9,   // user_state_tree_depth
    32,   // epoch_tree_depth
    3,   // EPOCH_KEY_NONCE_PER_EPOCH
    252 // MAX_REPUTATION_SCORE_BITS
);
