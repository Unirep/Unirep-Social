import { SnarkProof } from '@unirep/utils'
import { BigNumberish } from '@ethersproject/bignumber'
import { Prover, ReputationProof } from '@unirep/circuits'

/**
 * The reputation proof structure that helps to query the public signals
 */
export class ActionProof extends ReputationProof {
    readonly idx = {
        epochKey: 0,
        stateTreeRoot: 1,
        control0: 2,
        control1: 3,
        nullifiers: [4, 14],
        notEpochKey: 14,
        graffiti: 15,
        data: 16,
    }
    public notEpochKey: BigNumberish
    public repNullifiers: BigNumberish[]

    /**
     * @param _publicSignals The public signals of the reputation proof that can be verified by the prover
     * @param _proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        _publicSignals: BigNumberish[],
        _proof: SnarkProof,
        prover?: Prover
    ) {
        super(
            _publicSignals.map((n) => n.toString()),
            _proof,
            prover
        )
        this.notEpochKey = _publicSignals[this.idx.notEpochKey]
        this.graffiti = BigInt(_publicSignals[this.idx.graffiti].toString())
        this.data = BigInt(_publicSignals[this.idx.data.toString()])
        this.repNullifiers = []
        for (let i = this.idx.nullifiers[0]; i < this.idx.nullifiers[1]; i++) {
            this.repNullifiers.push(_publicSignals[i])
        }
        ;(this as any).circuit = 'actionProof'
    }
}
