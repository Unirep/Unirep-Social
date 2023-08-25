import { formatProofForSnarkjsVerification } from '@unirep/circuits'
import { Prover } from './daemons/Prover'
import {
    SignupProof,
    UserStateTransitionProof,
    EpochKeyLiteProof,
} from '@unirep/circuits'
import { DB } from 'anondb'
import { ethers } from 'ethers'
import { ActionProof } from '@unirep-social/circuits'

export const calcEpoch = (startTimestamp: number, epochLength: number) => {
    const now = Math.floor(+new Date() / 1000)
    const current = Math.floor((now - startTimestamp) / epochLength)
    return current
}

export const verifySignUpProof = async (req, publicSignals, proof) => {
    const signupProof = new SignupProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof),
        Prover
    )
    const currentEpoch = await req.unirep.attesterCurrentEpoch(
        req.unirepSocial.address
    )
    if (Number(signupProof.epoch) !== currentEpoch) {
        return 'Error: epoch of the proof mismatches current epoch'
    }

    if (
        signupProof.attesterId.toString() !==
        BigInt(req.unirepSocial.address).toString()
    ) {
        return 'Error: attester ID mismatches'
    }

    const valid = await signupProof.verify()
    if (!valid) {
        return 'Error: sign up proof is invalid'
    }

    return
}

export const verifyGSTRoot = async (
    epoch: number,
    gstRoot: string,
    attesterId: string | bigint,
    unirepContract: ethers.Contract
): Promise<boolean> => {
    return unirepContract.attesterStateTreeRootExists(
        attesterId,
        epoch,
        gstRoot
    )
}

export const verifyReputationProof = async (
    req: any,
    actionProof: ActionProof,
    spendReputation: number,
    unirepSocialId: bigint,
    currentEpoch: number
): Promise<string | undefined> => {
    const repNullifiers = actionProof.repNullifiers.map((n) => n.toString())
    const epoch = Number(actionProof.epoch)
    const gstRoot = actionProof.stateTreeRoot.toString()
    const attesterId = Number(actionProof.attesterId)

    // check if epoch is correct
    if (epoch !== Number(currentEpoch)) {
        return 'Error: epoch of the proof mismatches current epoch'
    }

    // check attester ID
    if (Number(unirepSocialId) !== attesterId) {
        return 'Error: proof with wrong attester ID'
    }

    // TODO: check rep nullifiers
    for (let i = 0; i < spendReputation; i++) {
        const exist = await req.unirepSocial.usedRepNullifier(repNullifiers[i])
        if (exist) {
            return `Error: the nullifier is already used`
        }
    }

    const isProofValid = await actionProof.verify()
    if (!isProofValid) {
        return 'Error: invalid reputation proof'
    }

    // check GST root
    {
        const exists = await verifyGSTRoot(
            epoch,
            gstRoot,
            unirepSocialId,
            req.unirep
        )
        if (!exists) {
            return `Global state tree root ${gstRoot} is not in epoch ${epoch}`
        }
    }
}

export const verifyEpochKeyLiteProof = async (
    req: any,
    epochKeyLiteProof: EpochKeyLiteProof,
    epoch: number,
    epochKey: string
): Promise<string | undefined> => {
    const proofEpoch = Number(epochKeyLiteProof.epoch)

    // check post/comment epoch and epk proof epoch
    {
        if (proofEpoch !== epoch)
            return `Proof epoch: ${proofEpoch} is not the post/comment epoch: ${epoch}`
    }
    // check post/comment epoch key and the proof
    {
        if (epochKey !== epochKeyLiteProof.epochKey.toString())
            return `Proof epoch key: ${epochKeyLiteProof.epochKey} is not the post/comment epoch: ${epochKey}`
    }

    const isProofValid = await epochKeyLiteProof.verify()
    if (!isProofValid) {
        return 'Error: invalid epoch key proof'
    }
}

export const verifySubsidyProof = async (
    req: any,
    actionProof: ActionProof,
    currentEpoch: number,
    unirepSocialId: bigint | string,
    voteReceiver?: string
): Promise<string | undefined> => {
    const epoch = Number(actionProof.epoch)
    const gstRoot = actionProof.stateTreeRoot.toString()
    const attesterId = actionProof.attesterId

    // check if epoch is correct
    if (epoch !== Number(currentEpoch)) {
        return 'Error: epoch of the proof mismatches current epoch'
    }

    // check GST root
    {
        const exists = await verifyGSTRoot(
            epoch,
            gstRoot,
            attesterId,
            req.unirep
        )
        if (!exists) {
            return `Global state tree root ${gstRoot} is not in epoch ${epoch}`
        }
    }

    // check attester ID
    if (unirepSocialId.toString() !== attesterId.toString()) {
        return 'Error: proof with wrong attester ID'
    }

    // check vote receiver is not the proof owner
    if (voteReceiver && voteReceiver !== actionProof.notEpochKey) {
        return 'Error: prove wrong receiver'
    }

    const isProofValid = await actionProof.verify()
    if (!isProofValid) {
        return 'Error: invalid subsidy proof'
    }
}

export const verifyNegRepProof = async (
    req: any,
    actionProof: ActionProof,
    unirepSocialId: number,
    currentEpoch: number
): Promise<string | undefined> => {
    const epoch = Number(actionProof.epoch)
    const epk = actionProof.epochKey
    const gstRoot = actionProof.stateTreeRoot.toString()
    const attesterId = actionProof.attesterId

    // check if epoch is correct
    if (epoch !== Number(currentEpoch)) {
        return 'Error: epoch of the proof mismatches current epoch'
    }

    // check attester ID
    if (Number(unirepSocialId) !== Number(attesterId)) {
        return 'Error: proof with wrong attester ID'
    }

    const isProofValid = await actionProof.verify()
    if (!isProofValid) {
        return 'Error: invalid negative reputation proof'
    }

    // check GST root
    {
        const exists = await verifyGSTRoot(
            epoch,
            gstRoot,
            attesterId,
            req.unirep
        )
        if (!exists) {
            return `Global state tree root ${gstRoot} is not in epoch ${epoch}`
        }
    }

    // Has been airdropped before
    const findRecord = await req.db.findOne('Record', {
        where: { to: epk, from: 'UnirepSocial' },
    })
    if (findRecord) {
        return `Error: the epoch key has been airdropped`
    }
}

export const verifyUSTProof = async (
    db: DB,
    results: any,
    currentEpoch: number
): Promise<string | undefined> => {
    // User state transition proof
    const USTProof = new UserStateTransitionProof(
        results.publicSignals,
        results.proof,
        Prover
    )
    const isValid = await USTProof.verify()
    if (!isValid) {
        return 'Error: user state transition proof generated is not valid!'
    }

    // Check history tree root
    // const root = USTProof.historyTreeRoot.toString()
    // const attesterId = USTProof.attesterId.toString()
    // {
    //     const exists = await verifyHistoryTree(db, root, attesterId)
    //     if (!exists) {
    //         return `History tree root ${root} does not exist`
    //     }
    // }

    const toEpoch = Number(USTProof.toEpoch)
    if (toEpoch !== currentEpoch) {
        return `To epoch (${toEpoch}) mismatches current epoch: ${currentEpoch}`
    }

    // check nullifiers
    const exists = await db.findOne('Nullifier', {
        where: {
            nullifier: USTProof.epochKeys[0].toString(),
        },
    })
    if (exists) {
        return `Error: invalid epoch key nullifier`
    }
}
