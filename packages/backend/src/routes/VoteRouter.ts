import { Express } from 'express'
import catchError from '../catchError'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'
import { ReputationProof, BaseProof } from '@unirep/contracts'
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
    app.post('/api/vote/subsidy', catchError(voteSubsidy))
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
    const receiver = BigInt(`0x${req.body.receiver.replace('0x', '')}`)

    const { dataId } = req.body
    const [post, comment] = await Promise.all([
        req.db.findOne('Post', { where: { _id: dataId } }),
        req.db.findOne('Comment', { where: { _id: dataId } }),
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
    // save to db data
    await req.db.create('Record', {
        to: req.body.receiver,
        from: epochKey,
        upvote: req.body.upvote,
        downvote: req.body.downvote,
        epoch: currentEpoch,
        action: ActionType.Vote,
        transactionHash: hash,
        data: dataId,
        confirmed: 0,
    })
    res.json({
        transaction: hash,
        newVote,
    })
    // make sure tx above succeeds before changing the db below
    TransactionManager.wait(hash)
        .then(async () => {
            await req.db.transaction(async (db) => {
                const [post, comment] = await Promise.all([
                    req.db.findOne('Post', { where: { _id: dataId } }),
                    req.db.findOne('Comment', { where: { _id: dataId } }),
                ])
                if (post) {
                    db.update('Post', {
                        where: {
                            _id: post._id,
                        },
                        update: {
                            posRep: post.posRep + req.body.upvote,
                            negRep: post.negRep + req.body.downvote,
                            totalRep:
                                post.totalRep +
                                req.body.upvote -
                                req.body.downvote,
                        },
                    })
                }
                if (comment) {
                    db.update('Comment', {
                        where: {
                            _id: comment._id,
                        },
                        update: {
                            posRep: comment.posRep + req.body.upvote,
                            negRep: comment.negRep + req.body.downvote,
                            totalRep:
                                comment.totalRep +
                                req.body.upvote -
                                req.body.downvote,
                        },
                    })
                }
            })
        })
        .catch(() => console.log('Vote tx reverted'))
}

async function voteSubsidy(req, res) {
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

    const { publicSignals, proof } = req.body
    const reputationProof = new BaseProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof)
    )
    const epochKey = publicSignals[2]

    const { dataId } = req.body
    const [post, comment] = await Promise.all([
        req.db.findOne('Post', { where: { _id: dataId } }),
        req.db.findOne('Comment', { where: { _id: dataId } }),
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

    console.log(
        `Attesting to epoch key ${req.body.receiver} with pos rep ${req.body.upvote}, neg rep ${req.body.downvote}`
    )

    const { attestingFee } = await unirepContract.config()
    const calldata = unirepSocialContract.interface.encodeFunctionData(
        'voteSubsidy',
        [
            req.body.upvote,
            req.body.downvote,
            ethers.BigNumber.from(`0x${req.body.receiver.replace('0x', '')}`),
            reputationProof.publicSignals,
            reputationProof.proof,
        ]
    )
    const hash = await TransactionManager.queueTransaction(
        unirepSocialContract.address,
        {
            data: calldata,
            // TODO: make this more clear?
            // 2 attestation calls into unirep: https://github.com/Unirep/Unirep-Social/blob/alpha/contracts/UnirepSocial.sol#L200
            value: attestingFee.mul(2),
        }
    )
    const newVote = await req.db.create('Vote', {
        transactionHash: hash,
        epoch: currentEpoch,
        receiver: req.body.receiver,
        voter: epochKey,
        posRep: req.body.upvote,
        negRep: req.body.downvote,
        graffiti: '0',
        overwriteGraffiti: false,
        postId: post ? dataId : '',
        commentId: comment ? dataId : '',
        status: 0,
    })
    res.json({
        transaction: hash,
        newVote,
    })
    // make sure tx above succeeds before changing the db below
    TransactionManager.wait(hash)
        .then(async () => {
            await req.db.transaction(async (db) => {
                const [post, comment] = await Promise.all([
                    req.db.findOne('Post', { where: { _id: dataId } }),
                    req.db.findOne('Comment', { where: { _id: dataId } }),
                ])
                if (post) {
                    db.update('Post', {
                        where: {
                            _id: post._id,
                        },
                        update: {
                            posRep: post.posRep + req.body.upvote,
                            negRep: post.negRep + req.body.downvote,
                            totalRep:
                                post.totalRep +
                                req.body.upvote -
                                req.body.downvote,
                        },
                    })
                }
                if (comment) {
                    db.update('Comment', {
                        where: {
                            _id: comment._id,
                        },
                        update: {
                            posRep: comment.posRep + req.body.upvote,
                            negRep: comment.negRep + req.body.downvote,
                            totalRep:
                                comment.totalRep +
                                req.body.upvote -
                                req.body.downvote,
                        },
                    })
                }
            })
        })
        .catch(() => console.log('Vote tx reverted'))
}
