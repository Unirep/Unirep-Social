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
    app.post('/api/usernames', catchError(setUsername))
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

    // accept a requested new username and ZK proof proving the epoch key and current username (graffiti pre-image)
    const { newUsername, publicSignals, proof } = req.body
    const usernameProof = new ReputationProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof)
    )

    const epochKey = usernameProof.epochKey.toString()
    const currentUsername = usernameProof.graffitiPreImage.toString()

    // check if the requested new username is free
    const hashedNewUsername = hashOne(newUsername).toString()
    const isClaimed = await unirepSocialContract.usernames(hashedNewUsername)

    if (isClaimed) {
        res.status(409).json({ error: 'Usernmae already exists' })
        return
    } else {
        // claim username via Unirep Social contract
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
