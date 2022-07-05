import {
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    USER_STATE_TREE_DEPTH,
    MAX_REPUTATION_BUDGET,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
} from '@unirep/circuits/config'
import { ethers } from 'ethers'

const attestingFee = ethers.utils.parseEther('0.1')

const epochLength = 900 // seconds

const globalStateTreeDepth = GLOBAL_STATE_TREE_DEPTH

const userStateTreeDepth = USER_STATE_TREE_DEPTH

const epochTreeDepth = EPOCH_TREE_DEPTH

const maxUsers = 2 ** GLOBAL_STATE_TREE_DEPTH - 1

const maxAttesters = 2 ** USER_STATE_TREE_DEPTH - 1

export const settings = {
    attestingFee,
    epochLength,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    maxUsers,
    maxAttesters,
    MAX_REPUTATION_BUDGET,
}

export const treeDepth = {
    epochTreeDepth,
    globalStateTreeDepth,
    userStateTreeDepth,
}
