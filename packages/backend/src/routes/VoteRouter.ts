import { Express } from 'express'
import catchError from '../catchError'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'
import { ReputationProof } from '@unirep/contracts'
import { ethers } from 'ethers'
import {
    UNIREP,
    UNIREP_SOCIAL_ABI,
    UNIREP_ABI,
    UNIREP_SOCIAL,
    DEFAULT_ETH_PROVIDER,
    UNIREP_SOCIAL_ATTESTER_ID,
} from '../constants'
import { ActionType } from '@unirep-social/core'
import { verifyReputationProof } from '../utils'
import TransactionManager from '../daemons/TransactionManager'

export default (app: Express) => {
    app.post('/api/vote', catchError(vote))
}

async function vote(req, res) {
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

    const { publicSignals, proof } = req.body
    const reputationProof = new ReputationProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof)
    )
    const epochKey = BigInt(reputationProof.epochKey.toString()).toString(16)
    const receiver = BigInt('0x' + req.body.receiver)

    const { dataId } = req.body
    const [post, comment] = await Promise.all([
        req.db.findOne('Post', { where: { transactionHash: dataId } }),
        req.db.findOne('Comment', { where: { transactionHash: dataId } }),
    ])
    if (post && comment) {
        res.status(500).json({
            error: 'Found post and comment with same id',
        })
        return
    } else if (!post && !comment) {
        res.status(404).json({
            error: `Unable to find object with id ${dataId}`,
        })
        return
    }
    let postProofIndex: number = 0
    if (post) {
        if (post.epoch !== currentEpoch) {
            res.status(422).json({
                info: 'The epoch key is expired',
            })
            return
        }

        const validProof = await req.db.findOne('Proof', {
            where: {
                index: post.proofIndex,
                epoch: currentEpoch,
                valid: true,
            },
        })
        if (!validProof) {
            res.status(422).json({
                info: 'Voting for invalid post',
            })
            return
        }
        postProofIndex = post.proofIndex
    } else if (comment) {
        if (comment.epoch !== currentEpoch) {
            res.status(422).json({
                info: 'Epoch key is expired',
            })
            return
        }
        const validProof = await req.db.findOne('Proof', {
            where: {
                index: comment.proofIndex,
                epoch: currentEpoch,
                valid: true,
            },
        })
        if (!validProof) {
            res.status(422).json({
                info: 'Voting for invalid comment',
            })
            return
        }
        postProofIndex = comment.proofIndex
    } else {
        throw new Error('unreachable')
    }

    if (Number(postProofIndex) === 0) {
        res.status(404).json({
            info: 'Cannot find post proof index',
        })
        return
    }

    const error = await verifyReputationProof(
        req.db,
        reputationProof,
        req.body.upvote + req.body.downvote,
        unirepSocialId,
        currentEpoch
    )
    if (error !== undefined) {
        res.status(422).json({
            error,
        })
        return
    }

    console.log(
        `Attesting to epoch key ${req.body.receiver} with pos rep ${req.body.upvote}, neg rep ${req.body.downvote}`
    )

    const { attestingFee } = await unirepContract.config()
    const calldata = unirepSocialContract.interface.encodeFunctionData('vote', [
        req.body.upvote,
        req.body.downvote,
        ethers.BigNumber.from(`0x${req.body.receiver.replace('0x', '')}`),
        postProofIndex,
        reputationProof.publicSignals,
        reputationProof.proof,
    ])
    const hash = await TransactionManager.queueTransaction(
        unirepSocialContract.address,
        {
            data: calldata,
            // TODO: make this more clear?
            // 2 attestation calls into unirep: https://github.com/Unirep/Unirep-Social/blob/alpha/contracts/UnirepSocial.sol#L200
            value: attestingFee.mul(2),
        }
    )
    // save to db data
    const newVote = await req.db.create('Vote', {
        transactionHash: hash,
        epoch: currentEpoch,
        voter: epochKey,
        receiver: req.body.receiver,
        posRep: req.body.upvote,
        negRep: req.body.downvote,
        graffiti: '0',
        overwriteGraffiti: false,
        postId: post ? dataId : '',
        commentId: comment ? dataId : '',
        status: 0,
    })

    await req.db.create(
        'Nullifier',
        reputationProof.repNullifiers
            .filter((n) => n.toString() !== '0')
            .map((n) => ({
                nullifier: n.toString(),
                epoch: currentEpoch,
                transactionHash: hash,
                confirmed: false,
            }))
    )
    await req.db.create('Record', {
        to: req.body.receiver,
        from: epochKey,
        upvote: req.body.upvote,
        downvote: req.body.downvote,
        epoch: currentEpoch,
        action: ActionType.Vote,
        transactionHash: hash,
        data: dataId,
        confirmed: false,
    })
    res.json({
        transaction: hash,
        newVote,
    })
}
