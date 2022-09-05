import { Express } from 'express'
import catchError from '../catchError'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'
import { ReputationProof, BaseProof } from '@unirep/contracts'
import { ethers } from 'ethers'
import {
    UNIREP_SOCIAL,
    DEFAULT_ETH_PROVIDER,
    DEFAULT_POST_KARMA,
    QueryType,
    UNIREP_SOCIAL_ATTESTER_ID,
    LOAD_POST_COUNT,
    titlePrefix,
    titlePostfix,
    UNIREP,
    UNIREP_ABI,
    UNIREP_SOCIAL_ABI,
} from '../constants'
import { ActionType } from '@unirep-social/core'
import { verifyReputationProof } from '../utils'
import TransactionManager from '../daemons/TransactionManager'

export default (app: Express) => {
    app.get('/api/post', catchError(loadPosts))
    app.get('/api/post/:id', catchError(loadPostById))
    app.get('/api/post/:postId/comments', catchError(loadCommentsByPostId))
    app.get('/api/post/:postId/votes', catchError(loadVotesByPostId))
    app.post('/api/post', catchError(createPost))
    app.post('/api/post/subsidy', catchError(createPostSubsidy))
}

async function loadCommentsByPostId(req, res) {
    const { postId } = req.params
    const comments = await req.db.findMany('Comment', {
        where: {
            postId,
        },
    })
    res.json(comments)
}

async function loadVotesByPostId(req, res) {
    const { postId } = req.params
    const votes = await req.db.findMany('Vote', {
        where: {
            postId,
        },
    })
    res.json(votes)
}

async function loadPostById(req, res) {
    const post = await req.db.findOne('Post', {
        where: {
            _id: req.params.id,
        },
    })
    res.json(post)
}

async function loadPosts(req, res) {
    if (req.query.query === undefined) {
        const posts = await req.db.findMany('Post', {
            where: {
                status: 1,
            },
        })
        res.json(posts)
        return
    }
    const query = req.query.query.toString()
    // TODO: deal with this when there's an offset arg
    // const lastRead = req.query.lastRead || 0
    const epks = req.query.epks ? req.query.epks.split('_') : undefined

    const posts = await req.db.findMany('Post', {
        where: {
            epochKey: epks,
        },
        orderBy: {
            createdAt: query === QueryType.New ? 'desc' : undefined,
            posRep: query === QueryType.Boost ? 'desc' : undefined,
            negRep: query === QueryType.Squash ? 'desc' : undefined,
            totalRep: query === QueryType.Rep ? 'desc' : undefined,
            commentCount: query === QueryType.Comments ? 'desc' : undefined,
        },
        limit: LOAD_POST_COUNT,
    })
    res.json(posts)
}

async function createPost(req, res) {
    // should have content, epk, proof, minRep, nullifiers, publicSignals
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
    const { publicSignals, proof } = req.body
    const reputationProof = new ReputationProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof)
    )
    const epochKey = reputationProof.epochKey.toString()
    const minRep = Number(reputationProof.minRep)

    const error = await verifyReputationProof(
        req.db,
        reputationProof,
        DEFAULT_POST_KARMA,
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

    const { title, content } = req.body

    const calldata = unirepSocialContract.interface.encodeFunctionData(
        'publishPost',
        [
            title !== undefined && title.length > 0
                ? `${titlePrefix}${title}${titlePostfix}${content}`
                : content,
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

    const post = await req.db.create('Post', {
        content,
        title,
        epochKey,
        epoch: currentEpoch,
        proveMinRep: minRep !== null ? true : false,
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
        downvote: DEFAULT_POST_KARMA,
        epoch: currentEpoch,
        action: ActionType.Post,
        data: hash,
        transactionHash: hash,
        confirmed: 0,
    })

    res.json({
        transaction: hash,
        currentEpoch: currentEpoch,
        post,
    })
}

async function createPostSubsidy(req, res) {
    // should have content, epk, proof, minRep, nullifiers, publicSignals
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
    const { publicSignals, proof } = req.body
    const subsidyProof = new BaseProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof)
    )

    const { attestingFee } = await unirepContract.config()

    const { title, content } = req.body

    const calldata = unirepSocialContract.interface.encodeFunctionData(
        'publishPostSubsidy',
        [
            title !== undefined && title.length > 0
                ? `${titlePrefix}${title}${titlePostfix}${content}`
                : content,
            subsidyProof.publicSignals,
            subsidyProof.proof,
        ]
    )
    const epochKey = publicSignals[1]
    const minRep = publicSignals[4]
    const hash = await TransactionManager.queueTransaction(
        unirepSocialContract.address,
        {
            data: calldata,
            value: attestingFee,
        }
    )
    const post = await req.db.create('Post', {
        content,
        title,
        epochKey,
        epoch: currentEpoch,
        proveMinRep: minRep !== null ? true : false,
        minRep: Number(minRep),
        posRep: 0,
        negRep: 0,
        status: 0,
        transactionHash: hash,
    })
    res.json({
        transaction: hash,
        currentEpoch: currentEpoch,
        post,
    })
}
