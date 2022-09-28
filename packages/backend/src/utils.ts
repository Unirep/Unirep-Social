import { Circuit, formatProofForSnarkjsVerification } from '@unirep/circuits'
import { Prover } from './daemons/Prover'
import {
    ReputationProof,
    SignUpProof,
    UserTransitionProof,
    StartTransitionProof,
    ProcessAttestationsProof,
    EpochKeyProof,
} from '@unirep/contracts'
import { DB } from 'anondb'
import { UNIREP, UNIREP_ABI, DEFAULT_ETH_PROVIDER } from './constants'
import { ethers } from 'ethers'

const unirepContract = new ethers.Contract(
    UNIREP,
    UNIREP_ABI,
    DEFAULT_ETH_PROVIDER
)

const verifyGSTRoot = async (
    db: DB,
    epoch: number,
    gstRoot: string
): Promise<boolean> => {
    return unirepContract.globalStateTreeRoots(epoch, gstRoot)
}

const verifyEpochTreeRoot = async (
    db: DB,
    epoch: number,
    epochTreeRoot: string
) => {
    const root = await unirepContract.epochRoots(epoch)
    return root.eq(ethers.BigNumber.from(epochTreeRoot))
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
    // if (repNullifiersAmount !== spendReputation) {
    //     return 'Error: proof with wrong reputation amount'
    // }

    const isProofValid = await Prover.verifyProof(
        Circuit.proveReputation,
        (reputationProof as any).publicSignals,
        reputationProof._snarkProof
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
}

const verifyEpochKeyProof = async (
    db: DB,
    epochKeyProof: EpochKeyProof,
    epoch: number,
    epochKey: string
): Promise<string | undefined> => {
    const proofEpoch = Number(epochKeyProof.epoch)
    const gstRoot = epochKeyProof.globalStateTree.toString()

    // check GST root
    {
        const exists = await verifyGSTRoot(db, epoch, gstRoot)
        if (!exists) {
            return `Global state tree root ${gstRoot} is not in epoch ${epoch}`
        }
    }
    // check post/comment epoch and epk proof epoch
    {
        if (proofEpoch !== epoch)
            return `Proof epoch: ${proofEpoch} is not the post/comment epoch: ${epoch}`
    }
    // check post/comment epoch key and the proof
    {
        if (epochKey !== epochKeyProof.epochKey)
            return `Proof epoch key: ${epochKeyProof.epochKey} is not the post/comment epoch: ${epochKey}`
    }

    const isProofValid = await Prover.verifyProof(
        Circuit.verifyEpochKey,
        (epochKeyProof as any).publicSignals,
        formatProofForSnarkjsVerification(epochKeyProof.proof as string[])
    )
    if (!isProofValid) {
        return 'Error: invalid epoch key proof'
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
    // Check if the fromEpoch is less than the current epoch
    if (
        Number(results.finalTransitionProof.transitionedFromEpoch) >=
        currentEpoch
    ) {
        return 'Error: user transitions from an invalid epoch'
    }

    // Start user state transition proof
    let isValid = await new StartTransitionProof(
        results.startTransitionProof.publicSignals,
        results.startTransitionProof.proof,
        Prover
    ).verify()
    if (!isValid) {
        return 'Error: start state transition proof generated is not valid!'
    }

    // Process attestations proofs
    for (let i = 0; i < results.processAttestationProofs.length; i++) {
        const isValid = await new ProcessAttestationsProof(
            results.processAttestationProofs[i].publicSignals,
            results.processAttestationProofs[i].proof,
            Prover
        ).verify()
        if (!isValid) {
            return 'Error: process attestations proof generated is not valid!'
        }
    }

    // User state transition proof
    const USTProof = new UserTransitionProof(
        results.finalTransitionProof.publicSignals,
        results.finalTransitionProof.proof,
        Prover
    )
    isValid = await USTProof.verify()
    if (!isValid) {
        return 'Error: user state transition proof generated is not valid!'
    }

    // Check epoch tree root
    const epoch = Number(USTProof.transitionFromEpoch)
    const gstRoot = USTProof.fromGlobalStateTree
    const epochTreeRoot = USTProof.fromEpochTree
    {
        const exists = await verifyGSTRoot(db, epoch, gstRoot.toString())
        if (!exists) {
            return `Global state tree root ${gstRoot} is not in epoch ${epoch}`
        }
    }
    {
        const exists = await verifyEpochTreeRoot(
            db,
            epoch,
            epochTreeRoot.toString()
        )
        if (!exists) {
            return `Epoch tree root ${epochTreeRoot} is not in epoch ${epoch}`
        }
    }

    // check nullifiers
    const exists = await db.findOne('Nullifier', {
        where: {
            nullifier: results.finalTransitionProof.epkNullifiers,
        },
    })
    if (exists) {
        return `Error: invalid epoch key nullifier`
    }
}

export {
    verifyReputationProof,
    verifyUSTProof,
    verifyEpochKeyProof,
    verifyAirdropProof,
}
