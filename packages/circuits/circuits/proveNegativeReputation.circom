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

template ProveNegativeReputation(GST_tree_depth, user_state_tree_depth, epoch_tree_depth, EPOCH_KEY_NONCE_PER_EPOCH, MAX_REPUTATION_SCORE_BITS) {
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
    signal input maxRep;
    signal output epochKey;

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

    /* 4. Check if user has reputation < maxRep */

    component rep_negativity_check = GreaterThan(MAX_REPUTATION_SCORE_BITS);
    rep_negativity_check.in[0] <== neg_rep;
    rep_negativity_check.in[1] <== pos_rep;
    rep_negativity_check.out === 1;

    component max_rep_check = GreaterEqThan(MAX_REPUTATION_SCORE_BITS);
    max_rep_check.in[0] <== neg_rep - pos_rep;
    max_rep_check.in[1] <== maxRep;
    max_rep_check.out === 1;

    /* End of check 4 */

    /* 5. Output an epoch key */

    component epochKeyHasher = Poseidon(2);

    epochKeyHasher.inputs[0] <== identity_nullifier;
    epochKeyHasher.inputs[1] <== epoch;
    component epoch_key_mod = ModuloTreeDepth(epoch_tree_depth);
    epoch_key_mod.dividend <== epochKeyHasher.out;
    epochKey <== epoch_key_mod.remainder;

    /* End of check 5 */
}
