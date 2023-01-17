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
import { ActionType, SubsidyProof } from '@unirep-social/core'
import { verifyReputationProof, verifySubsidyProof } from '../utils'
import TransactionManager from '../daemons/TransactionManager'
import { Prover } from '../daemons/Prover'

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

    const { publicSignals, proof, dataId, receiver, upvote, downvote } =
        req.body
    const reputationProof = new ReputationProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof)
    )
    const epochKey = reputationProof.epochKey.toString()

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
        upvote + downvote,
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
        `Attesting to epoch key ${receiver} with pos rep ${upvote}, neg rep ${downvote}`
    )

    const { attestingFee } = await unirepContract.config()
    const calldata = unirepSocialContract.interface.encodeFunctionData('vote', [
        upvote,
        downvote,
        ethers.BigNumber.from(receiver),
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

    let graffiti
    if (reputationProof.graffitiPreImage != '0') {
        graffiti = ethers.utils.toUtf8String(
            '0x' +
                BigInt(reputationProof.graffitiPreImage as string).toString(16)
        )
    }
    console.log('leave post with username:', graffiti)

    const newVote = await req.db.create('Vote', {
        transactionHash: hash,
        epoch: currentEpoch,
        voter: epochKey,
        receiver: receiver,
        posRep: upvote,
        negRep: downvote,
        graffiti,
        overwriteGraffiti: false,
        postId: post ? dataId : '',
        commentId: comment ? dataId : '',
        status: 0,
    })
    // save to db data
    await req.db.create('Record', {
        to: receiver,
        from: epochKey,
        upvote: upvote,
        downvote: downvote,
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
                            posRep: post.posRep + upvote,
                            negRep: post.negRep + downvote,
                            totalRep: post.totalRep + upvote - downvote,
                        },
                    })
                }
                if (comment) {
                    db.update('Comment', {
                        where: {
                            _id: comment._id,
                        },
                        update: {
                            posRep: comment.posRep + upvote,
                            negRep: comment.negRep + downvote,
                            totalRep: comment.totalRep + upvote - downvote,
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

    const { publicSignals, proof, dataId, receiver, upvote, downvote } =
        req.body
    const subsidyProof = new SubsidyProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof),
        Prover
    )
    const epochKey = publicSignals[1]

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

    const unirepSocialId = UNIREP_SOCIAL_ATTESTER_ID

    const error = await verifySubsidyProof(
        req.db,
        subsidyProof,
        currentEpoch,
        unirepSocialId,
        receiver
    )
    if (error !== undefined) {
        res.status(422).json({
            error,
        })
        return
    }

    console.log(
        `Attesting to epoch key ${receiver} with pos rep ${upvote}, neg rep ${downvote}`
    )

    const { attestingFee } = await unirepContract.config()
    const calldata = unirepSocialContract.interface.encodeFunctionData(
        'voteSubsidy',
        [
            upvote,
            downvote,
            ethers.BigNumber.from(receiver),
            subsidyProof.publicSignals,
            subsidyProof.proof,
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
        receiver: receiver,
        voter: epochKey,
        posRep: upvote,
        negRep: downvote,
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
        spentFromSubsidy: true,
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
                            posRep: post.posRep + upvote,
                            negRep: post.negRep + downvote,
                            totalRep: post.totalRep + upvote - downvote,
                        },
                    })
                }
                if (comment) {
                    db.update('Comment', {
                        where: {
                            _id: comment._id,
                        },
                        update: {
                            posRep: comment.posRep + upvote,
                            negRep: comment.negRep + downvote,
                            totalRep: comment.totalRep + upvote - downvote,
                        },
                    })
                }
            })
        })
        .catch(() => console.log('Vote tx reverted'))
}
