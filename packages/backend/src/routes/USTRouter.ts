import { Express } from 'express'
import catchError from '../catchError'
import { verifyUSTProof } from '../utils'
import TransactionManager from '../daemons/TransactionManager'
export default (app: Express) => {
    app.post('/api/userStateTransition', catchError(userStateTransition))
}

async function userStateTransition(req, res) {
    const currentEpoch = await req.unirep.attesterCurrentEpoch(
        req.unirepSocial.address
    )

    const { publicSignals, proof } = req.body.results

    const error = await verifyUSTProof(req.db, req.body.results, currentEpoch)
    if (error !== undefined) {
        res.status(422).json({
            error,
        })
        return
    }

    const calldata = req.unirep.interface.encodeFunctionData(
        'userStateTransition',
        [publicSignals, proof]
    )
    const hash = await TransactionManager.queueTransaction(
        req.unirep.address,
        calldata
    )
    res.json({
        transaction: hash,
    })
}
