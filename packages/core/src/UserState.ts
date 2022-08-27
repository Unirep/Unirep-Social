import { UserState } from '@unirep/core'
import { BaseProof } from '@unirep/contracts'
import { stringifyBigInts } from '@unirep/crypto'

export class SocialUserState extends UserState {
    async genSubsidyProof(
        attesterId: BigInt,
        minRep: BigInt = BigInt(0),
        notEpochKey: BigInt = BigInt(0)
    ) {
        const epoch = await this.latestTransitionedEpoch()
        const leafIndex = await this.latestGSTLeafIndex()
        const rep = await this.getRepByAttester(attesterId)
        const posRep = rep.posRep.toNumber()
        const negRep = rep.negRep.toNumber()
        const graffiti = rep.graffiti
        const signUp = rep.signUp.toNumber()
        const userStateTree = await this.genUserStateTree(epoch)
        const GSTree = await this.genGSTree(epoch)
        const GSTreeProof = GSTree.createProof(leafIndex)
        const USTPathElements = userStateTree.createProof(attesterId)

        const circuitInputs = stringifyBigInts({
            epoch,
            identity_nullifier: this.id.identityNullifier,
            identity_trapdoor: this.id.trapdoor,
            user_tree_root: userStateTree.root,
            GST_path_index: GSTreeProof.pathIndices,
            GST_path_elements: GSTreeProof.siblings,
            attester_id: attesterId,
            pos_rep: posRep,
            neg_rep: negRep,
            graffiti: graffiti,
            sign_up: signUp,
            UST_path_elements: USTPathElements,
            minRep,
            notEpochKey,
        })

        const results = await this.prover.genProofAndPublicSignals(
            'proveSubsidyKey',
            circuitInputs
        )

        const _proof = new BaseProof(
            results.publicSignals,
            results.proof,
            this.prover
        )
        ;(_proof as any).circuit = 'proveSubsidyKey'
        return _proof
    }
}
