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

    const code = req.query.invitationCode.toString()
    const deleted = await req.db.delete('InvitationCode', { where: { code } })
    if (deleted !== 1 && code !== ADMIN_SESSION_CODE) {
        res.status(403).json({ error: 'Invalid invitation code' })
        return
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

    res.json({
        transaction: hash,
        epoch: epoch.toNumber(),
    })
}
