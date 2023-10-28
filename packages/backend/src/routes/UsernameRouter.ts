import { Express } from 'express'
import catchError from '../catchError'
import { ethers } from 'ethers'
import { DEFAULT_USERNAME_REP } from '../constants'
import TransactionManager from '../daemons/TransactionManager'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'
import { verifyReputationProof } from '../utils'
import { ActionType } from '../Synchronizer'
import { ActionProof } from '@unirep-social/circuits'
import { Prover } from '../daemons/Prover'

export default (app: Express) => {
    app.post('/api/usernames', catchError(setUsername))
}

async function setUsername(req, res) {
    const currentEpoch = Number(
        await req.unirep.attesterCurrentEpoch(req.unirepSocial.address)
    )

    // accept a requested new username and ZK proof proving the epoch key and current username (graffiti pre-image)
    const { newUsername, publicSignals, proof } = req.body

    const usernameProof = new ActionProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof),
        Prover
    )

    // verify this reputation proof and return an error if it's invalid
    const error = await verifyReputationProof(
        req,
        usernameProof,
        DEFAULT_USERNAME_REP,
        BigInt(req.unirepSocial.address),
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
        usernameProof.graffiti.toString() !== '0' &&
        usernameProof.proveGraffiti.toString() !== '1'
    ) {
        res.status(422).json({
            error: `Error: prove graffiti ${usernameProof.proveGraffiti} is not 1`,
        })
        return
    }

    // check if user has already set username in current epoch before
    const epochKey = usernameProof.epochKey.toString()
    const recordsCount = await req.db.count('Record', {
        from: epochKey,
        to: epochKey,
        action: ActionType.SetUsername,
        epoch: currentEpoch,
    })

    if (recordsCount > 0) {
        res.status(409).json({
            error: 'Set username invalid: could not set username more than once in same epoch.',
        })
        return
    }

    // username validation
    const regex = new RegExp('^[a-zA-Z0-9_-]{3,40}$')

    if (!regex.test(newUsername)) {
        res.status(409).json({
            error: 'Username invalid: please set a username length between 3 to 40, and do not use special characters and spaces, only letters and numbers are allowed.',
        })
        return
    }

    // check if the requested new username is free
    const hexNewUsername = ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(newUsername)
    )

    const isClaimed = await req.unirepSocial.usernames(hexNewUsername)

    if (isClaimed) {
        res.status(409).json({ error: 'Username already exists' })
        return
    }

    // claim username via Unirep Social contract
    const currentUsername = BigInt(usernameProof.graffiti)
    const calldata = req.unirepSocial.interface.encodeFunctionData(
        'setUsername',
        [epochKey, currentUsername, hexNewUsername]
    )

    const hash = await TransactionManager.queueTransaction(
        req.unirepSocial.address,
        { data: calldata }
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
