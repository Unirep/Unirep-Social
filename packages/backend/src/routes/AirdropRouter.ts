import { Express } from 'express'
import catchError from '../catchError'
import { DEFAULT_SUBSIDY } from '../constants'
import { verifySubsidyProof } from '../utils'
import TransactionManager from '../daemons/TransactionManager'
import { Prover } from '../daemons/Prover'
import { ActionProof } from '@unirep-social/circuits'
import { ActionType } from '../Synchronizer'

export default (app: Express) => {
    app.post('/api/airdrop', catchError(getAirdrop))
}

async function getAirdrop(req, res) {
    const currentEpoch = await req.unirep.attesterCurrentEpoch(
        req.unirepSocial.address
    )

    // Parse Inputs
    const { publicSignals, proof } = req.body
    const subsidyProof = new ActionProof(publicSignals, proof, Prover)

    // Verify proof
    const spentSubsidy = (
        await req.unirepSocial.subsidies(currentEpoch, subsidyProof.epochKey)
    ).toNumber()
    if (spentSubsidy) {
        res.status(422).json({ error: 'Error: airdrop requested' })
        return
    }
    const error = await verifySubsidyProof(
        req,
        subsidyProof,
        currentEpoch,
        BigInt(req.unirepSocial.address)
    )
    if (error !== undefined) {
        res.status(422).json({ error })
        return
    }
    if (Number(subsidyProof.maxRep) > DEFAULT_SUBSIDY) {
        res.status(422).json({ error: 'Error: wrong neg req' })
        return
    }
    if (Number(subsidyProof.maxRep) === 0) {
        res.status(422).json({ error: 'Error: should request rep' })
        return
    }
    if (subsidyProof.revealNonce.toString() !== '1') {
        res.status(422).json({ error: 'Error: nonce is not revealed' })
        return
    }
    if (subsidyProof.nonce.toString() !== '0') {
        res.status(422).json({ error: 'Error: nonce is not valid' })
        return
    }

    // submit epoch key to unirep social contract
    const calldata = req.unirepSocial.interface.encodeFunctionData(
        'getSubsidyAirdrop',
        [subsidyProof.publicSignals, subsidyProof.proof]
    )
    const hash = await TransactionManager.queueTransaction(
        req.unirepSocial.address,
        {
            data: calldata,
        }
    )
    await req.db.create('Record', {
        to: subsidyProof.epochKey.toString(),
        from: 'UnirepSocial',
        upvote: Number(subsidyProof.maxRep),
        downvote: 0,
        epoch: currentEpoch,
        action: ActionType.Airdrop,
        data: '0',
        transactionHash: hash,
        confirmed: 0,
    })
    res.json({ transaction: hash })
}
