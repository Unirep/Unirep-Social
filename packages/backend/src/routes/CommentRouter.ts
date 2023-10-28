import { Express } from 'express'
import catchError from '../catchError'
import { ethers } from 'ethers'
import TransactionManager from '../daemons/TransactionManager'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'
import { EpochKeyLiteProof } from '@unirep/circuits'
import {
    verifyEpochKeyLiteProof,
    verifyReputationProof,
    verifySubsidyProof,
} from '../utils'
import {
    DEFAULT_COMMENT_REP,
    QueryType,
    LOAD_POST_COUNT,
    DELETED_CONTENT,
} from '../constants'
import { Prover } from '../daemons/Prover'
import { ActionType } from '../Synchronizer'
import { ActionProof } from '@unirep-social/circuits'

export default (app: Express) => {
    app.get('/api/comment/:id', catchError(loadComment))
    app.get('/api/comment/:commentId/votes', catchError(loadVotesByCommentId))
    app.get('/api/comment/', catchError(listComments))
    app.post('/api/comment', catchError(createComment))
    app.post('/api/comment/subsidy', catchError(createCommentSubsidy))
    app.post('/api/comment/edit/:id', catchError(editComment))
    app.post('/api/comment/delete/:id', catchError(deleteComment))
}

async function loadComment(req, res, next) {
    const comment = await req.db.findOne('Comment', {
        where: {
            _id: req.params.id,
        },
    })
    if (!comment) res.status(404).json('no such comment')
    else res.json(comment)
}

async function loadVotesByCommentId(req, res, next) {
    const { commentId } = req.params
    const votes = await req.db.findMany('Vote', {
        where: {
            commentId,
        },
    })
    res.json(votes)
}

async function listComments(req, res, next) {
    if (req.query.query === undefined) {
        const comments = await req.db.findMany('Comment', { where: {} })
        res.json(comments)
        return
    }
    const lastRead = req.query.lastRead ? req.query.lastRead.split('_') : []
    const query = req.query.query.toString()
    const epks = req.query.epks ? req.query.epks.split('_') : undefined

    const comments = (
        await req.db.findMany('Comment', {
            where: {
                createdAt:
                    lastRead && query === QueryType.New
                        ? {
                              $lt: +lastRead,
                          }
                        : undefined,
                epochKey: epks,
            },
            // TODO: add an offset argument for non-chronological sorts
            orderBy: {
                createdAt: query === QueryType.New ? 'desc' : undefined,
                posRep: query === QueryType.Boost ? 'desc' : undefined,
                negRep: query === QueryType.Squash ? 'desc' : undefined,
                totalRep: query === QueryType.Rep ? 'desc' : undefined,
            },
        })
    ).filter((c) => !lastRead.includes(c._id))

    res.json(comments.slice(0, Math.min(LOAD_POST_COUNT, comments.length)))
}

async function createComment(req, res) {
    const currentEpoch = Number(
        await req.unirep.attesterCurrentEpoch(req.unirepSocial.address)
    )

    // Parse Inputs
    const { publicSignals, proof, postId, content } = req.body
    const reputationProof = new ActionProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof),
        Prover
    )
    const epochKey = reputationProof.epochKey.toString()
    const minRep = Number(reputationProof.minRep)
    const hashedContent = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(content)
    )

    const error = await verifyReputationProof(
        req,
        reputationProof,
        DEFAULT_COMMENT_REP,
        BigInt(req.unirepSocial.address),
        currentEpoch
    )
    if (error !== undefined) {
        res.status(422).json({
            error,
        })
        return
    }

    const post = await req.db.findOne('Post', {
        where: {
            _id: postId,
        },
    })
    if (!post) {
        res.status(400).json({
            error: 'Post does not exist',
        })
        return
    }
    const calldata = req.unirepSocial.interface.encodeFunctionData(
        'leaveComment',
        [
            post.onChainId,
            hashedContent,
            reputationProof.publicSignals,
            reputationProof.proof,
        ]
    )
    const hash = await TransactionManager.queueTransaction(
        req.unirepSocial.address,
        {
            data: calldata,
        }
    )

    let graffiti
    if (reputationProof.graffiti.toString() !== '0') {
        graffiti = ethers.utils.toUtf8String(
            '0x' + BigInt(reputationProof.graffiti).toString(16)
        )
    }

    const comment = await req.db.create('Comment', {
        postId,
        content,
        hashedContent,
        epochKey,
        epoch: currentEpoch,
        proveMinRep: minRep !== 0 ? true : false,
        minRep: Number(minRep),
        posRep: 0,
        negRep: 0,
        status: 0,
        transactionHash: hash,
        graffiti,
    })
    await req.db.create('Record', {
        to: epochKey,
        from: epochKey,
        upvote: 0,
        downvote: DEFAULT_COMMENT_REP,
        epoch: currentEpoch,
        action: ActionType.Comment,
        data: comment._id,
        transactionHash: hash,
        confirmed: 0,
    })

    res.json({
        error: error,
        transaction: hash,
        currentEpoch: currentEpoch,
        comment,
    })
}

async function createCommentSubsidy(req, res) {
    const currentEpoch = Number(
        await req.unirep.attesterCurrentEpoch(req.unirepSocial.address)
    )

    // Parse Inputs
    const { publicSignals, proof, postId, content } = req.body
    const subsidyProof = new ActionProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof),
        Prover
    )
    const epochKey = subsidyProof.epochKey.toString()
    const minRep = subsidyProof.minRep
    const hashedContent = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(content)
    )

    const totalSubsidy = (await req.unirepSocial.subsidy()).toNumber()
    const spentSubsidy = (
        await req.unirepSocial.subsidies(currentEpoch, epochKey)
    ).toNumber()
    if (spentSubsidy + DEFAULT_COMMENT_REP > totalSubsidy) {
        const error = `Error: Request too much subsidy, only ${
            totalSubsidy - spentSubsidy
        } subsidy left`
        res.status(422).json({
            error,
        })
        return
    }
    const error = await verifySubsidyProof(
        req,
        subsidyProof,
        currentEpoch,
        BigInt(req.unirepSocial.address)
    )
    if (error !== undefined) {
        res.status(422).json({
            error,
        })
        return
    }

    const post = await req.db.findOne('Post', {
        where: {
            _id: postId,
        },
    })
    if (!post) {
        res.status(400).json({
            error: 'Post does not exist',
        })
        return
    }
    const calldata = req.unirepSocial.interface.encodeFunctionData(
        'publishCommentSubsidy',
        [
            post.onChainId,
            hashedContent,
            subsidyProof.publicSignals,
            subsidyProof.proof,
        ]
    )
    const hash = await TransactionManager.queueTransaction(
        req.unirepSocial.address,
        {
            data: calldata,
        }
    )

    let graffiti
    if (subsidyProof.graffiti.toString() !== '0') {
        graffiti = ethers.utils.toUtf8String(
            '0x' + BigInt(subsidyProof.graffiti).toString(16)
        )
    }
    const comment = await req.db.create('Comment', {
        postId,
        content,
        hashedContent,
        epochKey,
        epoch: currentEpoch,
        proveMinRep: minRep.toString() !== '0' ? true : false,
        minRep: Number(minRep),
        posRep: 0,
        negRep: 0,
        status: 0,
        transactionHash: hash,
        graffiti,
    })
    await req.db.create('Record', {
        to: epochKey,
        from: epochKey,
        upvote: 0,
        downvote: DEFAULT_COMMENT_REP,
        epoch: currentEpoch,
        action: ActionType.Comment,
        data: comment._id,
        transactionHash: hash,
        confirmed: 0,
        spentFromSubsidy: true,
    })

    res.json({
        transaction: hash,
        currentEpoch: currentEpoch,
        comment,
    })
}

async function editComment(req, res) {
    const id = req.params.id
    const { publicSignals, proof, content } = req.body

    const { transaction, error } = await editCommentOnChain(
        id,
        req,
        publicSignals,
        proof,
        content
    )

    if (error !== undefined) {
        res.status(422).json({
            error,
        })
    } else {
        const comment = await req.db.findOne('Comment', { where: { _id: id } })
        const currentEpoch = Number(
            await req.unirep.attesterCurrentEpoch(req.unirepSocial.address)
        )
        await req.db.create('Record', {
            to: comment.epochKey.toString(),
            from: comment.epochKey.toString(),
            upvote: 0,
            downvote: 0,
            epoch: currentEpoch,
            action: ActionType.EditComment,
            data: id,
            transactionHash: transaction,
            confirmed: 0,
            spentFromSubsidy: false,
        })

        res.json({
            error,
            transaction,
            comment,
        })
    }
}

async function deleteComment(req, res) {
    const id = req.params.id
    const { publicSignals, proof } = req.body

    const { transaction, error } = await editCommentOnChain(
        id,
        req,
        publicSignals,
        proof,
        DELETED_CONTENT
    )

    if (error !== undefined) {
        res.status(422).json({
            error,
        })
    } else {
        const comment = await req.db.findOne('Comment', { where: { _id: id } })
        const currentEpoch = Number(
            await req.unirep.attesterCurrentEpoch(req.unirepSocial.address)
        )
        await req.db.create('Record', {
            to: comment.epochKey.toString(),
            from: comment.epochKey.toString(),
            upvote: 0,
            downvote: 0,
            epoch: currentEpoch,
            action: ActionType.DeleteComment,
            data: id,
            transactionHash: transaction,
            confirmed: 0,
            spentFromSubsidy: false,
        })

        res.json({
            error,
            transaction,
            comment,
        })
    }
}

async function editCommentOnChain(id, req, publicSignals, proof, content) {
    // Parse Inputs
    const epkProof = new EpochKeyLiteProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof),
        Prover
    )
    const newHashedContent = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(content)
    )

    const {
        hashedContent: oldHashedContent,
        onChainId,
        epoch,
        epochKey,
    } = await req.db.findOne('Comment', {
        where: {
            _id: id,
        },
    })

    const error = await verifyEpochKeyLiteProof(req, epkProof, epoch, epochKey)
    if (error !== undefined) return { error }

    const calldata = req.unirepSocial.interface.encodeFunctionData('edit', [
        onChainId,
        oldHashedContent,
        newHashedContent,
        epkProof.publicSignals,
        epkProof.proof,
    ])

    const hash = await TransactionManager.queueTransaction(
        req.unirepSocial.address,
        {
            data: calldata,
        }
    )

    await req.db.update('Comment', {
        where: {
            _id: id,
            onChainId,
            hashedContent: oldHashedContent,
        },
        update: {
            content,
            hashedContent: newHashedContent,
            lastUpdatedAt: +new Date(),
        },
    })

    return { transaction: hash, error }
}
