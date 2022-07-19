import { Express } from 'express'
import catchError from '../catchError'
import {
    StartTransitionProof,
    ProcessAttestationsProof,
} from '@unirep/contracts'
import { ethers } from 'ethers'
import {
    UNIREP,
    UNIREP_ABI,
    UNIREP_SOCIAL_ABI,
    UNIREP_SOCIAL,
    DEFAULT_ETH_PROVIDER,
} from '../constants'
import { verifyUSTProof } from '../utils'
import TransactionManager from '../daemons/TransactionManager'

export default (app: Express) => {
    app.post('/api/userStateTransition', catchError(userStateTransition))
}

async function userStateTransition(req, res) {
    const unirepContract = new ethers.Contract(
        UNIREP,
        UNIREP_ABI,
        DEFAULT_ETH_PROVIDER
    )
    const unirepSocialContract = new ethers.Contract(
        UNIREP_SOCIAL,
        UNIREP_SOCIAL_ABI,
        DEFAULT_ETH_PROVIDER
    )
    const currentEpoch = Number(await unirepContract.currentEpoch())
    const {
        startTransitionProof,
        processAttestationProofs,
        finalTransitionProof,
    } = req.body.results
    const _startTransitionProof = new StartTransitionProof(
        startTransitionProof.publicSignals,
        startTransitionProof.proof
    )

    const error = await verifyUSTProof(req.db, req.body.results, currentEpoch)
    if (error !== undefined) {
        res.status(422).json({
            error,
        })
        return
    }

    // submit user state transition proofs
    {
        const calldata = unirepSocialContract.interface.encodeFunctionData(
            'startUserStateTransition',
            [startTransitionProof.publicSignals, startTransitionProof.proof]
        )
        const hash = await TransactionManager.queueTransaction(
            unirepSocialContract.address,
            calldata
        )
        await TransactionManager.wait(hash)
    }

    const txPromises = [] as Promise<any>[]
    for (let i = 0; i < processAttestationProofs.length; i++) {
        const { publicSignals, proof } = processAttestationProofs[i]
        const calldata = unirepSocialContract.interface.encodeFunctionData(
            'processAttestations',
            [publicSignals, proof]
        )
        const hash = await TransactionManager.queueTransaction(
            unirepSocialContract.address,
            calldata
        )
        txPromises.push(TransactionManager.wait(hash))
    }
    await Promise.all(txPromises)

    const proofIndexes: number[] = []
    {
        const proofNullifier = _startTransitionProof.hash()
        const proofIndex = await unirepContract.getProofIndex(proofNullifier)
        proofIndexes.push(Number(proofIndex))
    }
    for (let i = 0; i < processAttestationProofs.length; i++) {
        const _proof = new ProcessAttestationsProof(
            processAttestationProofs[i].publicSignals,
            processAttestationProofs[i].proof
        )
        const proofNullifier = _proof.hash()
        const proofIndex = await unirepContract.getProofIndex(proofNullifier)
        proofIndexes.push(Number(proofIndex))
    }
    const calldata = unirepSocialContract.interface.encodeFunctionData(
        'updateUserStateRoot',
        [
            finalTransitionProof.publicSignals,
            finalTransitionProof.proof,

            proofIndexes,
        ]
    )
    const hash = await TransactionManager.queueTransaction(
        unirepSocialContract.address,
        calldata
    )
    res.json({
        transaction: hash,
    })
}
