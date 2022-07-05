import { Express } from 'express'
import { UNIREP, UNIREP_SOCIAL } from '../constants'

export default (app: Express) => {
    app.get('/api/config', (_, res) =>
        res.json({
            unirepAddress: UNIREP,
            unirepSocialAddress: UNIREP_SOCIAL,
        })
    )
}
