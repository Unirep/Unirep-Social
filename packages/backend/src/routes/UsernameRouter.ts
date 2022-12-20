import { Express } from 'express'
import catchError from '../catchError'
import { ethers } from 'ethers'
import {
    UNIREP,
    UNIREP_ABI,
    DEFAULT_ETH_PROVIDER,
    UNIREP_SOCIAL,
    UNIREP_SOCIAL_ABI,
    UNIREP_SOCIAL_ATTESTER_ID,
    DEFAULT_USERNAME_KARMA,
} from '../constants'
import TransactionManager from '../daemons/TransactionManager'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'
import { ReputationProof } from '@unirep/contracts'
import { verifyReputationProof } from '../utils'
import { hashOne } from '@unirep/crypto'
import { ActionType } from '@unirep-social/core'

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
    const unirepSocialId = UNIREP_SOCIAL_ATTESTER_ID
    const currentEpoch = Number(await unirepContract.currentEpoch())

    // accept a requested new username and ZK proof proving the epoch key and current username (graffiti pre-image)
    const { newUsername, publicSignals, proof } = req.body

    const reputationProof = new ReputationProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof)
    )

    // verify this reputation proof and return an error if it's invalid
    const error = await verifyReputationProof(
        req.db,
        reputationProof,
        DEFAULT_USERNAME_KARMA,
        unirepSocialId,
        currentEpoch
    )
    if (error !== undefined) {
        res.status(422).json({
            error,
        })
        return `Error: Reputation proof is not verified`
    }

    // check that proveGraffiti is 1 if the preimage is not 0 (default value)
    if (
        reputationProof.graffitiPreImage.toString() !== '0' &&
        reputationProof.proveGraffiti.toString() !== '1'
    ) {
        res.status(422).json({
            error: `Error: prove graffiti ${reputationProof.proveGraffiti} is not 1`,
        })
        return
    }

    // username validation
    const regex = new RegExp('^[a-zA-Z0-9_-]{3,40}$')

    if (!regex.test(newUsername)) {
        res.status(409).json({ error: 'Username invalid' })
        return
    }

    // check if the requested new username is free
    const hashedNewUsername = hashOne(
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes(newUsername))
    ).toString()

    const isClaimed = await unirepSocialContract.usernames(hashedNewUsername)

    if (isClaimed) {
        res.status(409).json({ error: 'Username already exists' })
        return
    }

    // claim username via Unirep Social contract
    const epochKey = reputationProof.epochKey.toString()
    const currentUsername = reputationProof.graffitiPreImage.toString()
    const hashedCurrentUsername = hashOne(
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes(currentUsername))
    ).toString()
    const calldata = unirepSocialContract.interface.encodeFunctionData(
        'setUsername',
        [epochKey, hashedCurrentUsername, hashedNewUsername]
    )

    const { attestingFee } = await unirepContract.config()
    const hash = await TransactionManager.queueTransaction(
        unirepSocialContract.address,
        { data: calldata, value: attestingFee }
    )

    await req.db.create('Record', {
        to: epochKey,
        from: epochKey,
        upvote: 0,
        downvote: 0,
        epoch: currentEpoch,
        action: ActionType.SetUsername,
        data: newUsername,
        transactionHash: hash,
        confirmed: 1, // this should be checked in synchronizer???
    })

    res.json({
        transaction: hash,
    })
}
