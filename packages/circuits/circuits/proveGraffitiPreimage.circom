/*
    Prove:
    1. User exists in the Global State tree
    2. User own the epoch key
    3. Pre-image of graffiti
*/

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";
include "../node_modules/circomlib/circuits/mux1.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "./sparseMerkleTree.circom";
include "./identityCommitment.circom";
include "./incrementalMerkleTree.circom";
include "./modulo.circom";

template ProveGraffitiPreimage(GST_tree_depth, user_state_tree_depth, epoch_tree_depth, EPOCH_KEY_NONCE_PER_EPOCH) {
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
    signal output epochKey;

    /* 1. Calculate epoch key and check if yauser exists in the Global State Tree*/
	// calculate epoch key
	component epochKeyHasher = Poseidon(2);
    epochKeyHasher.inputs[0] <== identity_nullifier;
    epochKeyHasher.inputs[1] <== epoch;
    component epochKeyMod = ModuloTreeDepth(epoch_tree_depth);
    epochKeyMod.dividend <== epochKeyHasher.out;
    epochKey <== epochKeyMod.remainder;

	// check if user existst in the GST
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

    /* End of check 1 */

    /* 2. Check if the reputation given by the attester is in the user state tree */
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
    /* End of check 2 */

    /* 3. Verify preimage of graffiti */
    signal input graffiti_pre_image;

    component graffiti_hasher = Poseidon(1);
    graffiti_hasher.inputs[0] <== graffiti_pre_image;

    component graffiti_eq = IsEqual();
    graffiti_eq.in[0] <== graffiti_hasher.out;
    graffiti_eq.in[1] <== graffiti;

    graffiti_eq.out === 1;
    /* End of check 3 */
}