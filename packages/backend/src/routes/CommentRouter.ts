import { Express } from 'express'
import catchError from '../catchError'
import { ethers } from 'ethers'
import TransactionManager from '../daemons/TransactionManager'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'
import { EpochKeyProof, ReputationProof } from '@unirep/contracts'
import {
    verifyEpochKeyProof,
    verifyReputationProof,
    verifySubsidyProof,
} from '../utils'
import {
    UNIREP,
    UNIREP_SOCIAL_ABI,
    UNIREP_ABI,
    UNIREP_SOCIAL,
    DEFAULT_ETH_PROVIDER,
    DEFAULT_COMMENT_KARMA,
    UNIREP_SOCIAL_ATTESTER_ID,
    QueryType,
    LOAD_POST_COUNT,
    DELETED_CONTENT,
} from '../constants'
import { ActionType, SubsidyProof } from '@unirep-social/core'
import { Prover } from '../daemons/Prover'

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
    ).filter((c) => c.content !== DELETED_CONTENT && !lastRead.includes(c._id))

    res.json(comments.slice(0, Math.min(LOAD_POST_COUNT, comments.length)))
}

async function createComment(req, res) {
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

    // Parse Inputs
    const { publicSignals, proof, postId, content } = req.body
    const reputationProof = new ReputationProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof)
    )
    const epochKey = reputationProof.epochKey.toString()
    const minRep = Number(reputationProof.minRep)
    const hashedContent = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(content)
    )

    const error = await verifyReputationProof(
        req.db,
        reputationProof,
        DEFAULT_COMMENT_KARMA,
        unirepSocialId,
        currentEpoch
    )
    if (error !== undefined) {
        res.status(422).json({
            error,
        })
        return
    }

    const { attestingFee } = await unirepContract.config()
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
    const calldata = unirepSocialContract.interface.encodeFunctionData(
        'leaveComment',
        [
            post.onChainId,
            hashedContent,
            reputationProof.publicSignals,
            reputationProof.proof,
        ]
    )
    const hash = await TransactionManager.queueTransaction(
        unirepSocialContract.address,
        {
            data: calldata,
            value: attestingFee,
        }
    )

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
    })
    await req.db.create('Record', {
        to: epochKey,
        from: epochKey,
        upvote: 0,
        downvote: DEFAULT_COMMENT_KARMA,
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

    // Parse Inputs
    const { publicSignals, proof, postId, content } = req.body
    const subsidyProof = new SubsidyProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof),
        Prover
    )
    const epochKey = publicSignals[1]
    const minRep = publicSignals[4]
    const hashedContent = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(content)
    )
    const unirepSocialId = UNIREP_SOCIAL_ATTESTER_ID

    const error = await verifySubsidyProof(
        req.db,
        subsidyProof,
        currentEpoch,
        unirepSocialId
    )
    if (error !== undefined) {
        res.status(422).json({
            error,
        })
        return
    }

    const { attestingFee } = await unirepContract.config()
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
    const calldata = unirepSocialContract.interface.encodeFunctionData(
        'publishCommentSubsidy',
        [
            post.onChainId,
            hashedContent,
            subsidyProof.publicSignals,
            subsidyProof.proof,
        ]
    )
    const hash = await TransactionManager.queueTransaction(
        unirepSocialContract.address,
        {
            data: calldata,
            value: attestingFee,
        }
    )

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
    })
    await req.db.create('Record', {
        to: epochKey,
        from: epochKey,
        upvote: 0,
        downvote: DEFAULT_COMMENT_KARMA,
        epoch: currentEpoch,
        action: ActionType.Comment,
        data: comment._id,
        transactionHash: hash,
        confirmed: 0,
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
        req.db,
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
        req.db,
        publicSignals,
        proof,
        DELETED_CONTENT
    )

    if (error !== undefined) {
        res.status(422).json({
            error,
        })
    } else {
        res.json({
            error,
            transaction,
            id,
        })
    }
}

async function editCommentOnChain(id, db, publicSignals, proof, content) {
    const unirepSocialContract = new ethers.Contract(
        UNIREP_SOCIAL,
        UNIREP_SOCIAL_ABI,
        DEFAULT_ETH_PROVIDER
    )

    // Parse Inputs
    const epkProof = new EpochKeyProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof)
    )
    const newHashedContent = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(content)
    )

    const {
        hashedContent: oldHashedContent,
        onChainId,
        epoch,
        epochKey,
    } = await db.findOne('Comment', {
        where: {
            _id: id,
        },
    })

    const error = await verifyEpochKeyProof(db, epkProof, epoch, epochKey)
    if (error !== undefined) return { error }

    const calldata = unirepSocialContract.interface.encodeFunctionData('edit', [
        onChainId,
        oldHashedContent,
        newHashedContent,
        epkProof.publicSignals,
        epkProof.proof,
    ])

    const hash = await TransactionManager.queueTransaction(
        unirepSocialContract.address,
        {
            data: calldata,
        }
    )

    await db.update('Comment', {
        where: {
            _id: id,
            onChainId,
            hashedContent: oldHashedContent,
        },
        update: {
            content,
            hashedContent: newHashedContent,
            latestUpdatedAt: +new Date(),
        },
    })

    return { transaction: hash, error }
}
