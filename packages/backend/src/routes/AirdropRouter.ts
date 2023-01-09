import { Express } from 'express'
import { NegativeRepProof } from '@unirep-social/core'
import catchError from '../catchError'
import {
    UNIREP_SOCIAL,
    DEFAULT_ETH_PROVIDER,
    UNIREP_SOCIAL_ATTESTER_ID,
    UNIREP,
    UNIREP_ABI,
    UNIREP_SOCIAL_ABI,
    DEFAULT_AIRDROPPED_KARMA,
} from '../constants'
import { verifyNegRepProof } from '../utils'
import { ethers } from 'ethers'
import TransactionManager from '../daemons/TransactionManager'
import { Prover } from '../daemons/Prover'

export default (app: Express) => {
    app.post('/api/airdrop', catchError(getAirdrop))
}

async function getAirdrop(req, res) {
    // Unirep Social contract
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
    const unirepSocialId = UNIREP_SOCIAL_ATTESTER_ID
    const currentEpoch = Number(await unirepContract.currentEpoch())

    // Parse Inputs
    const { publicSignals, proof, negRep } = req.body
    const negRepProof = new NegativeRepProof(publicSignals, proof, Prover)

    const { attestingFee } = await unirepContract.config()

    // Verify proof
    const spentSubsidy = (
        await unirepSocialContract.subsidies(currentEpoch, negRepProof.epochKey)
    ).toNumber()
    if (spentSubsidy)
        res.status(422).json({ error: 'Error: airdrop requested' })
    const error = await verifyNegRepProof(
        req.db,
        negRepProof,
        Number(unirepSocialId),
        currentEpoch
    )
    if (error !== undefined) {
        res.status(422).json({ error: error })
        return
    }
    if (negRepProof.negRep > DEFAULT_AIRDROPPED_KARMA) {
        res.status(422).json({ error: 'Error: wrong neg req' })
        return
    }

    // submit epoch key to unirep social contract
    const calldata = unirepSocialContract.interface.encodeFunctionData(
        'getSubsidyAirdrop',
        [negRepProof.publicSignals, negRepProof.proof]
    )
    const hash = await TransactionManager.queueTransaction(
        unirepSocialContract.address,
        {
            data: calldata,
            value: attestingFee,
        }
    )
    await req.db.create('Record', {
        to: publicSignals[1],
        from: 'UnirepSocial',
        upvote:
            negRep > DEFAULT_AIRDROPPED_KARMA
                ? DEFAULT_AIRDROPPED_KARMA
                : negRep,
        downvote: 0,
        epoch: currentEpoch,
        action: 'Airdrop',
        data: '0',
        transactionHash: hash,
        confirmed: 0,
    })
    res.json({ transaction: hash })
}
