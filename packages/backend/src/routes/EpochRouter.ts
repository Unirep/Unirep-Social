import { Express } from 'express'
import { UNIREP_SOCIAL } from '../constants'
import catchError from '../catchError'

export default (app: Express) => {
    app.get('/api/epoch', catchError(getEpoch))
}

async function getEpoch(req, res) {
    const epoch = await req.db.findOne('Epoch', {
        where: {
            attesterId: BigInt(UNIREP_SOCIAL).toString(),
        },
        orderBy: {
            number: 'desc',
        },
    })
    res.json({
        epoch: epoch ? epoch.number : 0,
    })
}
