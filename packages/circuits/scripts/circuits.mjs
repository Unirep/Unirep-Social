import { CircuitConfig } from '@unirep/circuits'
const {
    STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    FIELD_COUNT,
    SUM_FIELD_COUNT,
    REPL_NONCE_BITS,
} = CircuitConfig.default

export const REP_BUDGET = 10
export const ptauName = 'powersOfTau28_hez_final_18.ptau'

export const circuitContents = {
    actionProof: `pragma circom 2.0.0; include "../circuits/actionProof.circom"; \n\ncomponent main { public [ graffiti, sig_data, not_epoch_key ] } = ActionProof(${STATE_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, ${SUM_FIELD_COUNT}, ${FIELD_COUNT}, ${REPL_NONCE_BITS}, ${REP_BUDGET});`,
}
