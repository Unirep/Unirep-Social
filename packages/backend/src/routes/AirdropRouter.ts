import { Express } from 'express'
import catchError from '../catchError'
import { SignUpProof } from '@unirep/contracts'
import {
    UNIREP_SOCIAL,
    DEFAULT_ETH_PROVIDER,
    UNIREP_SOCIAL_ATTESTER_ID,
    UNIREP,
    UNIREP_ABI,
    UNIREP_SOCIAL_ABI,
    DEFAULT_AIRDROPPED_KARMA,
} from '../constants'
import { verifyAirdropProof } from '../utils'
import { ethers } from 'ethers'
import TransactionManager from '../daemons/TransactionManager'

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
    const { publicSignals, proof } = req.body
    const signUpProof = new SignUpProof(publicSignals, proof)

    const attestingFee = await unirepContract.attestingFee()

    // Verify proof
    const error = await verifyAirdropProof(
        req.db,
        signUpProof,
        Number(unirepSocialId),
        currentEpoch
    )
    if (error !== undefined) {
        console.log('get airdrop error: ' + error)
        res.status(422).json({ error: error })
        return
    }

    // submit epoch key to unirep social contract
    const calldata = unirepSocialContract.interface.encodeFunctionData(
        'airdrop',
        [signUpProof]
    )
    const hash = await TransactionManager.queueTransaction(
        unirepSocialContract.address,
        {
            data: calldata,
            value: attestingFee,
        }
    )
    await req.db.create('Record', {
        to: publicSignals[1].toString(16),
        from: 'UnirepSocial',
        upvote: DEFAULT_AIRDROPPED_KARMA,
        downvote: 0,
        epoch: currentEpoch,
        action: 'UST',
        data: '0',
        transactionHash: hash,
        confirmed: false,
    })
    res.json({ transaction: hash })
}
