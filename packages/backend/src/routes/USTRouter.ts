import { Express } from 'express'
import catchError from '../catchError'
import {
    UserTransitionProof,
    computeStartTransitionProofHash,
} from '@unirep/contracts'
import { ethers } from 'ethers'
import {
    UNIREP,
    UNIREP_ABI,
    UNIREP_SOCIAL_ABI,
    UNIREP_SOCIAL,
    DEFAULT_ETH_PROVIDER,
} from '../constants'
import { formatProofForVerifierContract } from '@unirep/circuits'
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
    const { results } = req.body

    const error = await verifyUSTProof(req.db, results, currentEpoch)
    if (error !== undefined) {
        res.status(422).json({
            error,
        })
        return
    }

    // submit user state transition proofs
    const { blindedUserState, blindedHashChain, globalStateTreeRoot, proof } =
        results.startTransitionProof
    {
        const calldata = unirepSocialContract.interface.encodeFunctionData(
            'startUserStateTransition',
            [
                blindedUserState,
                blindedHashChain,
                globalStateTreeRoot,
                formatProofForVerifierContract(proof),
            ]
        )
        const hash = await TransactionManager.queueTransaction(
            unirepSocialContract.address,
            calldata
        )
        await TransactionManager.wait(hash)
    }

    const txPromises = [] as Promise<any>[]
    for (let i = 0; i < results.processAttestationProofs.length; i++) {
        const {
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            proof,
        } = results.processAttestationProofs[i]
        const calldata = unirepSocialContract.interface.encodeFunctionData(
            'processAttestations',
            [
                outputBlindedUserState,
                outputBlindedHashChain,
                inputBlindedUserState,
                formatProofForVerifierContract(proof),
            ]
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
        const proofNullifier = computeStartTransitionProofHash(
            blindedUserState,
            blindedHashChain,
            globalStateTreeRoot,
            formatProofForVerifierContract(proof)
        )
        const proofIndex = await unirepContract.getProofIndex(proofNullifier)
        proofIndexes.push(Number(proofIndex))
    }
    for (let i = 0; i < results.processAttestationProofs.length; i++) {
        const {
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            proof,
        } = results.processAttestationProofs[i]
        const proofNullifier = computeStartTransitionProofHash(
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            formatProofForVerifierContract(proof)
        )
        const proofIndex = await unirepContract.getProofIndex(proofNullifier)
        proofIndexes.push(Number(proofIndex))
    }
    const USTProof = new UserTransitionProof(
        results.finalTransitionProof.publicSignals,
        results.finalTransitionProof.proof
    )
    const calldata = unirepSocialContract.interface.encodeFunctionData(
        'updateUserStateRoot',
        [USTProof, proofIndexes]
    )
    const hash = await TransactionManager.queueTransaction(
        unirepSocialContract.address,
        calldata
    )
    res.json({
        transaction: hash,
    })
}
