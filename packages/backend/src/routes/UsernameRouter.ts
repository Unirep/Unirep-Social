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
import { verifyReputationProof, verifyGSTRoot } from '../utils'
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
    const unirepSocialId = UNIREP_SOCIAL_ATTESTER_ID
    const currentEpoch = Number(await unirepContract.currentEpoch())

    // accept a requested new username and ZK proof proving the epoch key and current username (graffiti pre-image)
    const { newUsername, publicSignals, proof } = req.body

    console.log('proof passed in router: ' + proof)
    const reputationProof = new ReputationProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof)
    )
    console.log('reputation proof: ' + reputationProof)

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

    // check that the glocalStateTree public signal exists in the current epoch
    const gstRoot = reputationProof.globalStateTree.toString()
    const exists = await verifyGSTRoot(req.db, currentEpoch, gstRoot)
    if (!exists) {
        return `Error: Global state tree root ${gstRoot} is not in epoch ${currentEpoch}`
    }

    // check that proveGraffiti is 1 if the preimage is not 0 (default value)
    if (
        reputationProof.graffitiPreImage !== 0 &&
        reputationProof.proveGraffiti !== 1
    ) {
        return `Error: prove graffiti ${reputationProof.proveGraffiti} is not 1`
    }

    // username validation
    const regex = new RegExp('^[a-zA-Z0-9_-]S*$')
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
        res.status(409).json({ error: 'Usernmae already exists' })
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

    const hash = await TransactionManager.queueTransaction(
        unirepSocialContract.address,
        calldata
    )
    res.json({
        transaction: hash,
    })
}
