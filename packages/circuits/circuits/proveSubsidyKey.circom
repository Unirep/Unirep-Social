/*
    Prove:
        1. if user has a leaf in an existed global state tree
        2. user state rep < 0
        3. output all epoch keys for epoch
*/

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";
include "../node_modules/circomlib/circuits/mux1.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/sign.circom";
include "./sparseMerkleTree.circom";
include "./identityCommitment.circom";
include "./incrementalMerkleTree.circom";
include "./modulo.circom";

template ProveSubsidyKey(GST_tree_depth, user_state_tree_depth, epoch_tree_depth, NUM_EPOCH_KEY_NONCE_PER_EPOCH, MAX_REPUTATION_SCORE_BITS) {
    signal input epoch;

    // Global state tree leaf: Identity & user state root
    signal private input identity_nullifier;
    signal private input identity_trapdoor;
    signal private input user_tree_root;
    // Global state tree
    signal private input GST_path_index[GST_tree_depth];
    signal private input GST_path_elements[GST_tree_depth][1];
    signal output GST_root;
    // Attester to prove reputation from
    signal input attester_id;
    // Attestation by the attester
    signal private input pos_rep;
    signal private input neg_rep;
    signal private input graffiti;
    signal private input sign_up;
    signal private input UST_path_elements[user_state_tree_depth][1];
    signal input minRep;
    signal input notEpochKey;
    signal output subsidyKey;

    // we only need to verify that one epk is in the gst
    // we can then simply calculate the others
    /* 1. Calculate subsidy key */

    component subsidyKeyHasher = Poseidon(2);

    subsidyKeyHasher.inputs[0] <== identity_nullifier + NUM_EPOCH_KEY_NONCE_PER_EPOCH;
    subsidyKeyHasher.inputs[1] <== epoch;
    subsidyKey <== subsidyKeyHasher.out;
    /* End of check 1 */

    /* 2. Check if user exists in the Global State Tree */

    component identity_commitment = IdentityCommitment();
    identity_commitment.identity_nullifier <== identity_nullifier;
    identity_commitment.identity_trapdoor <== identity_trapdoor;

    component leaf_hasher = Poseidon(2);
    leaf_hasher.inputs[0] <== identity_commitment.out;
    leaf_hasher.inputs[1] <== user_tree_root;

    component merkletree = MerkleTreeInclusionProof(GST_tree_depth);
    merkletree.leaf <== leaf_hasher.out;
    for (var i = 0; i < GST_tree_depth; i++) {
        merkletree.path_index[i] <== GST_path_index[i];
        merkletree.path_elements[i] <== GST_path_elements[i][0];
    }
    GST_root <== merkletree.root;

    /* End of check 2 */

    /* 3. Check if the claimed reputation given by the attester is in the user state tree */
    component reputation_hasher = Poseidon(5);
    reputation_hasher.inputs[0] <== pos_rep;
    reputation_hasher.inputs[1] <== neg_rep;
    reputation_hasher.inputs[2] <== graffiti;
    reputation_hasher.inputs[3] <== sign_up;
    reputation_hasher.inputs[4] <== 0;

    component reputation_membership_check = SMTLeafExists(user_state_tree_depth);
    reputation_membership_check.leaf_index <== attester_id;
    reputation_membership_check.leaf <== reputation_hasher.out;
    for (var i = 0; i < user_state_tree_depth; i++) {
        reputation_membership_check.path_elements[i][0] <== UST_path_elements[i][0];
    }
    reputation_membership_check.root <== user_tree_root;
    /* End of check 3 */

    /* 4. Check if user has reputation >= minRep */
    component pos_rep_check = GreaterEqThan(MAX_REPUTATION_SCORE_BITS);
    pos_rep_check.in[0] <== pos_rep;
    pos_rep_check.in[1] <== neg_rep;
    pos_rep_check.out === 1;
    component rep_check = GreaterEqThan(MAX_REPUTATION_SCORE_BITS);
    rep_check.in[0] <== pos_rep - neg_rep;
    rep_check.in[1] <== minRep;
    rep_check.out === 1;

    /* 5. Prove that user does not control a certain epoch key */

    component not_equal_check[NUM_EPOCH_KEY_NONCE_PER_EPOCH];
    component epoch_key_hasher[NUM_EPOCH_KEY_NONCE_PER_EPOCH];
    component epoch_key_mod[NUM_EPOCH_KEY_NONCE_PER_EPOCH];

    for (var i = 0; i < NUM_EPOCH_KEY_NONCE_PER_EPOCH; i++) {
      epoch_key_hasher[i] = Poseidon(2);
      epoch_key_hasher[i].inputs[0] <== identity_nullifier + i;
      epoch_key_hasher[i].inputs[1] <== epoch;

      epoch_key_mod[i] = ModuloTreeDepth(epoch_tree_depth);
      epoch_key_mod[i].dividend <== epoch_key_hasher[i].out;
      not_equal_check[i] = IsEqual();
      not_equal_check[i].in[0] <== notEpochKey;
      not_equal_check[i].in[1] <== epoch_key_mod[i].remainder;
      not_equal_check[i].out === 0;
    }

    /* End of check 6 */
}
