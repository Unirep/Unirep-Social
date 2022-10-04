import { Prover } from '@unirep/circuits'
import { BaseProof } from '@unirep/contracts'
import { SnarkProof } from '@unirep/crypto'
import { BigNumberish } from 'ethers'

/**
 * The subsidy proof structure that helps to query the public signals
 */
export class SubsidyProof extends BaseProof {
    readonly idx = {
        globalStateTreeRoot: 0,
        epochKey: 1,
        epoch: 2,
        attesterId: 3,
        minRep: 4,
        notEpochKey: 5,
    }
    public globalStateTreeRoot: BigNumberish
    public epoch: BigNumberish
    public epochKey: BigNumberish
    public attesterId: BigNumberish
    public minRep: BigNumberish
    public notEpochKey: BigNumberish

    /**
     * @param _publicSignals The public signals of the subsidy proof that can be verified by the prover
     * @param _proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        _publicSignals: BigNumberish[],
        _proof: SnarkProof,
        prover?: Prover
    ) {
        super(_publicSignals, _proof, prover)
        this.globalStateTreeRoot =
            _publicSignals[this.idx.globalStateTreeRoot].toString()
        this.epochKey = _publicSignals[this.idx.epochKey].toString()
        this.epoch = _publicSignals[this.idx.epoch].toString()
        this.attesterId = _publicSignals[this.idx.attesterId].toString()
        this.minRep = _publicSignals[this.idx.minRep].toString()
        this.notEpochKey = _publicSignals[this.idx.notEpochKey].toString()
        ;(this as any).circuit = 'proveSubsidyKey'
    }
}

/**
 * The negative reputation proof structure that helps to query the public signals
 */
export class NegativeRepProof extends BaseProof {
    readonly idx = {
        globalStateTreeRoot: 0,
        epochKey: 1,
        epoch: 2,
        attesterId: 3,
        negRep: 4,
    }
    public globalStateTreeRoot: BigNumberish
    public epoch: BigNumberish
    public epochKey: BigNumberish
    public attesterId: BigNumberish
    public negRep: BigNumberish

    /**
     * @param _publicSignals The public signals of the negative reputation proof that can be verified by the prover
     * @param _proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        _publicSignals: BigNumberish[],
        _proof: SnarkProof,
        prover?: Prover
    ) {
        super(_publicSignals, _proof, prover)
        this.globalStateTreeRoot =
            _publicSignals[this.idx.globalStateTreeRoot].toString()
        this.epochKey = _publicSignals[this.idx.epochKey].toString()
        this.epoch = _publicSignals[this.idx.epoch].toString()
        this.attesterId = _publicSignals[this.idx.attesterId].toString()
        this.negRep = _publicSignals[this.idx.negRep].toString()
        ;(this as any).circuit = 'proveNegativeReputation'
    }
}
