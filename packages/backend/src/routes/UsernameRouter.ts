import { Express } from 'express'
import catchError from '../catchError'
import { ethers } from 'ethers'
import {
    UNIREP,
    UNIREP_ABI,
    DEFAULT_ETH_PROVIDER,
    UNIREP_SOCIAL,
    UNIREP_SOCIAL_ABI,
    ADMIN_SESSION_CODE,
} from '../constants'
import TransactionManager from '../daemons/TransactionManager'

export default (app: Express) => {
    app.get('/api/username', catchError(setUsername))
}

async function setUsername(req, res) {
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

    // Parse Input

    const oldUsername = ''
    const newUsername = ''

    const calldata = unirepSocialContract.interface.encodeFunctionData(
        'setUsername',
        [currentEpoch, oldUsername, newUsername]
    )

    const hash = await TransactionManager.queueTransaction(
        unirepSocialContract.address,
        calldata
    )

    res.json({
        transaction: hash,
    })
}
