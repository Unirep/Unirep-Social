import { Circuit, formatProofForSnarkjsVerification } from '@unirep/circuits'
import { Prover } from './daemons/Prover'
import {
    ReputationProof,
    SignUpProof,
    UserTransitionProof,
} from '@unirep/contracts'
import { DB } from 'anondb'

const verifyGSTRoot = async (
    db: DB,
    epoch: number,
    gstRoot: string
): Promise<boolean> => {
    const exists = await db.findOne('GSTRoot', {
        where: {
            epoch,
            root: gstRoot,
        },
    })
    return !!exists
}

const verifyEpochTreeRoot = async (
    db: DB,
    epoch: number,
    epochTreeRoot: string
) => {
    const exists = await db.findOne('Epoch', {
        where: {
            number: epoch,
            epochRoot: epochTreeRoot,
        },
    })
    return !!exists
}

const verifyReputationProof = async (
    db: DB,
    reputationProof: ReputationProof,
    spendReputation: number,
    unirepSocialId: number,
    currentEpoch: number
): Promise<string | undefined> => {
    const repNullifiers = reputationProof.repNullifiers.map((n) => n.toString())
    const epoch = Number(reputationProof.epoch)
    const gstRoot = reputationProof.globalStateTree.toString()
    const attesterId = Number(reputationProof.attesterId)
    const repNullifiersAmount = Number(reputationProof.proveReputationAmount)

    // check if epoch is correct
    if (epoch !== Number(currentEpoch)) {
        return 'Error: epoch of the proof mismatches current epoch'
    }

    // check attester ID
    if (Number(unirepSocialId) !== attesterId) {
        return 'Error: proof with wrong attester ID'
    }

    // check reputation amount
    if (repNullifiersAmount !== spendReputation) {
        return 'Error: proof with wrong reputation amount'
    }

    const isProofValid = await Prover.verifyProof(
        Circuit.proveReputation,
        (reputationProof as any).publicSignals,
        formatProofForSnarkjsVerification(reputationProof.proof as string[])
    )
    if (!isProofValid) {
        return 'Error: invalid reputation proof'
    }

    // check GST root
    {
        const exists = await verifyGSTRoot(db, epoch, gstRoot)
        if (!exists) {
            return `Global state tree root ${gstRoot} is not in epoch ${epoch}`
        }
    }

    // check nullifiers
    const exists = await db.findOne('Nullifier', {
        where: {
            nullifier: reputationProof.repNullifiers.map((n) => n.toString()),
        },
    })
    if (exists) {
        return `Error: duplicate reputation nullifier`
    }
}

const verifyAirdropProof = async (
    db: DB,
    signUpProof: SignUpProof,
    unirepSocialId: number,
    currentEpoch: number
): Promise<string | undefined> => {
    const epoch = Number(signUpProof.epoch)
    const epk = signUpProof.epochKey.toString(16)
    const gstRoot = signUpProof.globalStateTree.toString()
    const attesterId = signUpProof.attesterId
    const userHasSignedUp = signUpProof.userHasSignedUp

    // check if epoch is correct
    if (epoch !== Number(currentEpoch)) {
        return 'Error: epoch of the proof mismatches current epoch'
    }

    // check attester ID
    if (Number(unirepSocialId) !== Number(attesterId)) {
        return 'Error: proof with wrong attester ID'
    }

    // Check if user has signed up in Unirep Social
    if (Number(userHasSignedUp) === 0) {
        return 'Error: user has not signed up in Unirep Social'
    }

    const isProofValid = await Prover.verifyProof(
        Circuit.proveUserSignUp,
        (signUpProof as any).publicSignals,
        formatProofForSnarkjsVerification(signUpProof.proof as string[])
    )
    if (!isProofValid) {
        return 'Error: invalid user sign up proof'
    }

    // check GST root
    {
        const exists = await verifyGSTRoot(db, epoch, gstRoot)
        if (!exists) {
            return `Global state tree root ${gstRoot} is not in epoch ${epoch}`
        }
    }

    // Has been airdropped before
    const findRecord = await db.findOne('Record', {
        where: { to: epk, from: 'UnirepSocial' },
    })
    if (findRecord) {
        return `Error: the epoch key has been airdropped`
    }
}

const verifyUSTProof = async (
    db: DB,
    results: any,
    currentEpoch: number
): Promise<string | undefined> => {
    let error
    // Check if the fromEpoch is less than the current epoch
    if (
        Number(results.finalTransitionProof.transitionedFromEpoch) >=
        currentEpoch
    ) {
        error = 'Error: user transitions from an invalid epoch'
        return error
    }

    // Start user state transition proof
    let isValid = await Prover.verifyProof(
        Circuit.startTransition,
        results.startTransitionProof.publicSignals,
        results.startTransitionProof.proof
    )
    if (!isValid) {
        error = 'Error: start state transition proof generated is not valid!'
        return error
    }

    // Process attestations proofs
    for (let i = 0; i < results.processAttestationProofs.length; i++) {
        const isValid = await Prover.verifyProof(
            Circuit.processAttestations,
            results.processAttestationProofs[i].publicSignals,
            results.processAttestationProofs[i].proof
        )
        if (!isValid) {
            error = 'Error: process attestations proof generated is not valid!'
            return error
        }
    }

    // User state transition proof
    const USTProof = new UserTransitionProof(
        results.finalTransitionProof.publicSignals,
        results.finalTransitionProof.proof
    )
    isValid = await Prover.verifyProof(
        Circuit.userStateTransition,
        (USTProof as any).publicSignals,
        formatProofForSnarkjsVerification(USTProof.proof as string[])
    )
    if (!isValid) {
        error = 'Error: user state transition proof generated is not valid!'
        return error
    }

    // Check epoch tree root
    const epoch = Number(results.finalTransitionProof.transitionedFromEpoch)
    const gstRoot = results?.finalTransitionProof?.fromGSTRoot
    const epochTreeRoot = results.finalTransitionProof.fromEpochTree
    {
        const exists = await verifyGSTRoot(db, epoch, gstRoot)
        if (!exists) {
            error = `Global state tree root ${gstRoot} is not in epoch ${epoch}`
            return error
        }
    }
    {
        const exists = await verifyEpochTreeRoot(db, epoch, epochTreeRoot)
        if (!exists) {
            error = `Epoch tree root ${epochTreeRoot} is not in epoch ${epoch}`
            return error
        }
    }

    // check nullifiers
    const exists = await db.findOne('Nullifier', {
        where: {
            nullifier: results.finalTransitionProof.epochKeyNullifiers,
        },
    })
    if (exists) {
        error = `Error: invalid reputation nullifier`
    }
    return error
}

export { verifyReputationProof, verifyUSTProof, verifyAirdropProof }
