import { Express } from 'express'
import catchError from '../catchError'
import { ethers } from 'ethers'
import {
    UNIREP,
    UNIREP_ABI,
    DEFAULT_ETH_PROVIDER,
    UNIREP_SOCIAL,
    UNIREP_SOCIAL_ABI,
} from '../constants'
import TransactionManager from '../daemons/TransactionManager'

export default (app: Express) => {
    app.get('/api/signup', catchError(signup))
}

async function signup(req, res) {
    const uploadedCommitment = req.query.commitment!.toString()
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

    if (!/^(0x)?[0-9a-fA-F]{64}$/.test(uploadedCommitment)) {
        res.status(400).json({
            error: 'Commitment must be exactly 64 hex characters with an optional 0x prefix',
        })
        return
    }

    const code = req.query.signupCode.toString()
    const existingCode = await req.db.findOne('SignupCode', {
        where: {
            _id: code,
        },
    })
    if (!existingCode) {
        res.json({
            error: 'Invalid signup code',
        })
        return
    }
    if (existingCode.usedAt) {
        res.json({
            error: 'This code has already been used',
        })
    }

    const commitment = `0x${uploadedCommitment.replace('0x', '')}`

    const calldata = unirepSocialContract.interface.encodeFunctionData(
        'userSignUp',
        [commitment]
    )
    const hash = await TransactionManager.queueTransaction(
        unirepSocialContract.address,
        calldata
    )

    const epoch = await unirepContract.currentEpoch()
    console.log('transaction: ' + hash + ', sign up epoch: ' + epoch.toString())
    await req.db.update('SignupCode', {
        where: {
            _id: code,
        },
        update: {
            usedAt: +new Date(),
        },
    })

    res.json({
        transaction: hash,
        epoch: epoch.toNumber(),
    })
}
