import { Express } from 'express'
import catchError from '../catchError'

export default (app: Express) => {
    app.get('/api/block', catchError(loadLatestBlock))
}

async function loadLatestBlock(req, res, next) {
    const state = await req.db.findOne('SynchronizerState', {
        where: {},
    })
    res.json({
        blockNumber: state?.latestCompleteBlock ?? 0,
    })
}
