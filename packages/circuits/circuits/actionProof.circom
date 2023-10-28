pragma circom 2.0.0;

/*
    Prove:
        1. reputation proof
        2. user doesn't own an input epoch key
        3. compute reputation nullifiers
*/

include "../../../node_modules/@unirep/circuits/circuits/reputation.circom";
include "../../../node_modules/@unirep/circuits/circuits/hasher.circom";


template ActionProof(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, SUM_FIELD_COUNT, FIELD_COUNT, REPL_NONCE_BITS, REP_BUDGET) {
    signal output epoch_key;
    signal input not_epoch_key;

    // Global state tree leaf: Identity & user state root
    signal input identity_secret;
    // Global state tree
    signal input state_tree_indices[STATE_TREE_DEPTH];
    signal input state_tree_elements[STATE_TREE_DEPTH];
    signal output state_tree_root;
    // Attestation by the attester
    signal input data[FIELD_COUNT];
    // Graffiti
    signal input prove_graffiti;
    signal input graffiti;
    // Epoch key
    signal input reveal_nonce;
    signal input attester_id;
    signal input epoch;
    signal input nonce;
    signal input chain_id;
    // Reputation
    signal input min_rep;
    signal input max_rep;
    signal input prove_min_rep;
    signal input prove_max_rep;
    signal input prove_zero_rep;
    signal input start_rep_nonce;
    signal input rep_nullifiers_amount;

    signal output control[2];
    signal output rep_nullifiers[REP_BUDGET];

    signal input sig_data;

    /* 1. Reputation proof */
    (epoch_key, state_tree_root, control) <== Reputation(
        STATE_TREE_DEPTH, 
        EPOCH_KEY_NONCE_PER_EPOCH, 
        SUM_FIELD_COUNT, 
        FIELD_COUNT, 
        REPL_NONCE_BITS
    )(
        identity_secret,
        state_tree_indices,
        state_tree_elements,
        data,
        prove_graffiti,
        graffiti,
        reveal_nonce,
        attester_id,
        epoch,
        nonce,
        chain_id,
        min_rep,
        max_rep,
        prove_min_rep,
        prove_max_rep,
        prove_zero_rep,
        sig_data
    );
    /* 2. Prove that user does not control a certain epoch key */

    signal epoch_key_hasher[EPOCH_KEY_NONCE_PER_EPOCH];
    signal not_equal_check[EPOCH_KEY_NONCE_PER_EPOCH];

    for (var i = 0; i < EPOCH_KEY_NONCE_PER_EPOCH; i++) {
        epoch_key_hasher[i] <== EpochKeyHasher()(
            identity_secret, 
            attester_id, 
            epoch, 
            i, 
            chain_id
        );
        not_equal_check[i] <== IsEqual()([not_epoch_key, epoch_key_hasher[i]]);
        not_equal_check[i] === 0;
    }

    /* End of check 2 */

    /* 3. Calculate reputation nullifiers */
    // 3.1.1 Check if rep_nullifiers_amount <= REP_BUDGET
    signal spent_rep_lte <== LessEqThan(8)([rep_nullifiers_amount, REP_BUDGET]);

    // 3.1.2 Check if pos_rep(data[0]) - neg_rep(data[1]) >= 0
    signal rep_gte <== GreaterEqThan(252)([data[0], data[1]]);

    // 3.1.3 Check if spent_reputation is zero or not
    signal nonce_gte <== GreaterEqThan(252)([data[0] - data[1], start_rep_nonce + rep_nullifiers_amount]);

    // 3.1.4 If rep_nullifiers_amount > 0, then check 3.1.1~3.1.3
    signal zero_comp <== IsZero()(rep_nullifiers_amount);
    signal valid_spent_rep <== MultiAND(3)([spent_rep_lte, rep_gte, nonce_gte]);
    signal valid_or <== OR()(zero_comp, valid_spent_rep);
    valid_or === 1;

    signal rep_nullifier_hasher[REP_BUDGET];
    signal if_above[REP_BUDGET];
    for (var i = 0; i < REP_BUDGET; i++) {
        // TODO: check what happens in an overflow condition
        if_above[i] <== GreaterThan(8)([rep_nullifiers_amount, i]); // use small bit amount because it should be lt 10
        var rep_nonce = i + start_rep_nonce;
        rep_nullifier_hasher[i] <== Poseidon(4)([identity_secret, epoch, rep_nonce, attester_id]);
        rep_nullifiers[i] <== rep_nullifier_hasher[i] * if_above[i];
    }
    /* End of check 3 */
}
