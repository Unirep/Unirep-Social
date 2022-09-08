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
import { formatProofForSnarkjsVerification } from '@unirep/circuits'
import { ReputationProof, BaseProof } from '@unirep/contracts'
import { hashOne } from '@unirep/crypto'

export default (app: Express) => {
    app.get('/api/usernames', catchError(setUsername))
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

    // accept a requested new username and ZK proof proving the epoch key and current graffiti pre-image
    const { newUsername, publicSignals, proof } = req.body
    const usernameProof = new ReputationProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof)
    )
    const epochKey = usernameProof.epochKey.toString()
    const currentUsername = Number(usernameProof.graffitiPreImage)

    // check if the new username is free
    const isClaimed = await unirepSocialContract.usernames(newUsername)

    if (isClaimed) {
        res.status(409).json({ error: 'Usernmae already exists' })
        return
    } else {
        // hash username and claim username calling setUsername func in unirep social
        const hashedNewUsername = hashOne(newUsername)

        const calldata = unirepSocialContract.interface.encodeFunctionData(
            'setUsername',
            [epochKey, currentUsername, hashedNewUsername]
        )

        const hash = await TransactionManager.queueTransaction(
            unirepSocialContract.address,
            calldata
        )
        res.json({
            transaction: hash,
        })
    }
}
