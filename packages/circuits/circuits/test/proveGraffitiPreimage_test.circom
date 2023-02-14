include "../proveGraffitiPreimage.circom";

component main = proveGraffitiPreimage(
	4,  // GST_tree_depth
	4,  // user_state_tree_depth,
	32, // epoch_tree_depth,
	3,  // EPOCK_KEY_NONCE_PER_EPOCH
);