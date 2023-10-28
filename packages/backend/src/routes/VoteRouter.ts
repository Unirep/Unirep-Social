import { Express } from 'express'
import catchError from '../catchError'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'
import { ethers } from 'ethers'
import { verifyReputationProof, verifySubsidyProof } from '../utils'
import TransactionManager from '../daemons/TransactionManager'
import { Prover } from '../daemons/Prover'
import { ActionType } from '../Synchronizer'
import { ActionProof } from '@unirep-social/circuits'

export default (app: Express) => {
    app.post('/api/vote', catchError(vote))
    app.post('/api/vote/subsidy', catchError(voteSubsidy))
}

async function vote(req, res) {
    const currentEpoch = Number(
        await req.unirep.attesterCurrentEpoch(req.unirepSocial.address)
    )

    const { publicSignals, proof, dataId, receiver, upvote, downvote } =
        req.body
    const reputationProof = new ActionProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof),
        Prover
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
        req,
        reputationProof,
        upvote + downvote,
        BigInt(req.unirepSocial.address),
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

    const calldata = req.unirepSocial.interface.encodeFunctionData('vote', [
        upvote,
        downvote,
        ethers.BigNumber.from(receiver),
        reputationProof.publicSignals,
        reputationProof.proof,
    ])
    const hash = await TransactionManager.queueTransaction(
        req.unirepSocial.address,
        {
            data: calldata,
            // TODO: make this more clear?
            // 2 attestation calls into unirep: https://github.com/Unirep/Unirep-Social/blob/alpha/contracts/UnirepSocial.sol#L200
        }
    )

    let graffiti
    let overwriteGraffiti = false
    if (reputationProof.graffiti.toString() !== '0') {
        graffiti = ethers.utils.toUtf8String(
            '0x' + BigInt(reputationProof.graffiti).toString(16)
        )
        overwriteGraffiti = true
    }

    const newVote = await req.db.create('Vote', {
        transactionHash: hash,
        epoch: currentEpoch,
        voter: epochKey,
        receiver: receiver,
        posRep: upvote,
        negRep: downvote,
        graffiti,
        overwriteGraffiti,
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
    const currentEpoch = Number(
        await req.unirep.attesterCurrentEpoch(req.unirepSocial.address)
    )

    const { publicSignals, proof, dataId, receiver, upvote, downvote } =
        req.body
    const subsidyProof = new ActionProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof),
        Prover
    )
    const epochKey = subsidyProof.epochKey.toString()

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

    const error = await verifySubsidyProof(
        req,
        subsidyProof,
        currentEpoch,
        BigInt(req.unirepSocial.address),
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

    const calldata = req.unirepSocial.interface.encodeFunctionData(
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
        req.unirepSocial.address,
        {
            data: calldata,
            // TODO: make this more clear?
            // 2 attestation calls into unirep: https://github.com/Unirep/Unirep-Social/blob/alpha/contracts/UnirepSocial.sol#L200
        }
    )

    let graffiti
    let overwriteGraffiti = false
    if (subsidyProof.graffiti.toString() !== '0') {
        graffiti = ethers.utils.toUtf8String(
            '0x' + BigInt(subsidyProof.graffiti).toString(16)
        )
        overwriteGraffiti = true
    }

    const newVote = await req.db.create('Vote', {
        transactionHash: hash,
        epoch: currentEpoch,
        receiver: receiver,
        voter: epochKey,
        posRep: upvote,
        negRep: downvote,
        graffiti,
        overwriteGraffiti,
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
