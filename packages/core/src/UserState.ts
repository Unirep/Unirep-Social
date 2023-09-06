import { ActionProof, REP_BUDGET } from '@unirep-social/circuits'
import { Prover } from '@unirep/circuits'
import { Synchronizer, UserState } from '@unirep/core'
import { stringifyBigInts } from '@unirep/utils'
import { Identity } from '@semaphore-protocol/identity'
import { poseidon4 } from 'poseidon-lite'
import { DB } from 'anondb'
import { ethers } from 'ethers'
import UNIREP_SOCIAL_ABI from '../abi/UnirepSocial.json'

export class SocialUserState extends UserState {
    public unirepSocial: ethers.Contract
    public maxReputationBudget: number

    constructor(config: {
        synchronizer?: Synchronizer
        db?: DB
        attesterId?: bigint | bigint[]
        unirepAddress?: string
        provider?: ethers.providers.Provider
        id: Identity
        prover: Prover
        unirepSocialAddress: string
    }) {
        super(config)
        this.unirepSocial = new ethers.Contract(
            config.unirepSocialAddress,
            UNIREP_SOCIAL_ABI,
            this.sync.provider
        )
        this.maxReputationBudget = REP_BUDGET
    }

    async start() {
        super.sync.start()
        this.maxReputationBudget = (
            await this.unirepSocial.maxReputationBudget()
        ).toNumber()
    }

    private checkEpkNonce(epochKeyNonce: number) {
        if (epochKeyNonce >= this.sync.settings.numEpochKeyNoncePerEpoch) {
            throw new Error(
                `@unirep-social/core: epochKeyNonce (${epochKeyNonce}) must be less than max epoch nonce`
            )
        }
    }

    genReputationNullifier(epoch: number, nonce: number) {
        return poseidon4([this.id.secret, epoch, nonce, this.sync.attesterId])
    }

    async nullifierExist(nullifier: any) {
        const exist = await this.unirepSocial.usedRepNullifier(nullifier)
        return exist
    }

    async genActionProof(
        options: {
            epkNonce?: number
            minRep?: number
            maxRep?: number
            graffiti?: bigint | string
            proveZeroRep?: boolean
            revealNonce?: boolean
            data?: bigint | string
            notEpochKey?: bigint | string
            spentRep?: bigint | number
        } = {}
    ) {
        const {
            minRep,
            maxRep,
            graffiti,
            proveZeroRep,
            revealNonce,
            epkNonce,
            notEpochKey,
            spentRep,
        } = options
        const nonce = epkNonce ?? 0
        this.checkEpkNonce(nonce)

        const epoch = await this.latestTransitionedEpoch(
            this.unirepSocial.address
        )
        const leafIndex = await this.latestStateTreeLeafIndex(
            epoch,
            this.unirepSocial.address
        )
        const data = await this.getData(epoch - 1, this.unirepSocial.address)
        const posRep = data[0]
        const negRep = data[1]
        const stateTree = await this.sync.genStateTree(
            epoch,
            this.unirepSocial.address
        )
        const stateTreeProof = stateTree.createProof(leafIndex)

        // find valid nonce starter
        let nonceStarter = -1
        for (let n = 0; n < posRep - negRep; n++) {
            const reputationNullifier = this.genReputationNullifier(epoch, n)
            if (!(await this.nullifierExist(reputationNullifier))) {
                nonceStarter = n
                break
            }
        }

        if (Number(spentRep) > 0 && nonceStarter == -1) {
            throw new Error('@unirep-social/core: All nullifiers are spent')
        }
        if (Number(spentRep) > this.maxReputationBudget) {
            throw new Error(
                `@unirep-social/core: Should not request more than ${this.maxReputationBudget} Rep`
            )
        }
        if (nonceStarter + Number(spentRep) > posRep - negRep) {
            throw new Error(
                `@unirep-social/core: Not enough reputation to spend`
            )
        }

        const circuitInputs = {
            identity_secret: this.id.secret,
            state_tree_indexes: stateTreeProof.pathIndices,
            state_tree_elements: stateTreeProof.siblings,
            data,
            graffiti: graffiti
                ? BigInt(graffiti) << BigInt(this.sync.settings.replNonceBits)
                : 0,
            epoch,
            nonce,
            attester_id: this.sync.attesterId.toString(),
            prove_graffiti: graffiti ? 1 : 0,
            min_rep: minRep ?? 0,
            max_rep: maxRep ?? 0,
            prove_max_rep: !!(maxRep ?? 0) ? 1 : 0,
            prove_min_rep: !!(minRep ?? 0) ? 1 : 0,
            prove_zero_rep: proveZeroRep ?? 0,
            reveal_nonce: revealNonce ?? 0,
            sig_data: options.data ?? 0,
            not_epoch_key: notEpochKey ?? 0,
            rep_nullifiers_amount: spentRep ?? 0,
            start_rep_nonce: nonceStarter,
        }

        const results = await this.prover.genProofAndPublicSignals(
            'actionProof',
            stringifyBigInts(circuitInputs)
        )

        return new ActionProof(
            results.publicSignals,
            results.proof,
            this.prover
        )
    }
}
