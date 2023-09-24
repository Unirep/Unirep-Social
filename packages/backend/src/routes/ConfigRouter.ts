import { Express } from 'express'
import { DEFAULT_ETH_PROVIDER_URL, UNIREP, UNIREP_SOCIAL } from '../constants'
import catchError from '../catchError'

export default (app: Express) => {
    app.get('/api/config', catchError(getConfig))
}

async function getConfig(req, res) {
    const attesterId = UNIREP_SOCIAL
    const {
        postReputation,
        commentReputation,
        subsidy,
        maxReputationBudget,
        epochLength,
        startTimestamp,
        stateTreeDepth,
        epochTreeDepth,
        fieldCount,
        sumFieldCount,
        numEpochKeyNoncePerEpoch,
    } = await req.db.findOne('Config', {
        where: {
            attesterId,
        },
    })
    res.json({
        unirepAddress: UNIREP,
        unirepSocialAddress: UNIREP_SOCIAL,
        ethProvider: DEFAULT_ETH_PROVIDER_URL,
        attesterId,
        postReputation,
        commentReputation,
        subsidy,
        maxReputationBudget,
        epochLength,
        startTimestamp,
        numEpochKeyNoncePerEpoch,
        stateTreeDepth,
        epochTreeDepth,
        fieldCount,
        sumFieldCount,
    })
}
