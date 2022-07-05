import { Express } from 'express'
import EpochManager from '../daemons/EpochManager'
import catchError from '../catchError'
import { ethers } from 'ethers'
import { UNIREP_ABI, UNIREP, DEFAULT_ETH_PROVIDER } from '../constants'
import TransactionManager from '../daemons/TransactionManager'

export default (app: Express) => {
    app.get('/api/epochTransition', catchError(loadNextTransition))
    app.post('/api/epochTransition', catchError(epochTransition))
}

async function loadNextTransition(req, res) {
    const nextTransition = await EpochManager.nextTransition()
    res.json({ nextTransition })
}

async function epochTransition(req, res) {
    if (req.headers.authorization !== 'NLmKDUnJUpc6VzuPc7Wm') {
        res.status(401).json({
            info: 'Not authorized',
        })
        return
    }
    const unirepContract = new ethers.Contract(
        UNIREP,
        UNIREP_ABI,
        DEFAULT_ETH_PROVIDER
    )

    const calldata = unirepContract.interface.encodeFunctionData(
        'beginEpochTransition',
        []
    )
    await TransactionManager.queueTransaction(unirepContract.address, calldata)
    res.status(204).end()
}
