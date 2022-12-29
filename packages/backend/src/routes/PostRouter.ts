import { Express } from 'express'
import catchError from '../catchError'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'
import { ReputationProof, EpochKeyProof } from '@unirep/contracts'
import { ethers } from 'ethers'
import {
    UNIREP_SOCIAL,
    DEFAULT_ETH_PROVIDER,
    DEFAULT_POST_KARMA,
    QueryType,
    UNIREP_SOCIAL_ATTESTER_ID,
    LOAD_POST_COUNT,
    UNIREP,
    UNIREP_ABI,
    UNIREP_SOCIAL_ABI,
    TITLE_LABEL,
    DELETED_CONTENT,
} from '../constants'
import { ActionType, SubsidyProof } from '@unirep-social/core'
import {
    verifyEpochKeyProof,
    verifyReputationProof,
    verifySubsidyProof,
} from '../utils'
import TransactionManager from '../daemons/TransactionManager'
import { Prover } from '../daemons/Prover'

export default (app: Express) => {
    app.get('/api/post', catchError(loadPosts))
    app.get('/api/post/:id', catchError(loadPostById))
    app.get('/api/post/:postId/comments', catchError(loadCommentsByPostId))
    app.get('/api/post/:postId/votes', catchError(loadVotesByPostId))

    app.post('/api/post', catchError(createPost))
    app.post('/api/post/subsidy', catchError(createPostSubsidy))
    app.post('/api/post/edit/:id', catchError(editPost))
    app.post('/api/post/delete/:id', catchError(deletePost))
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
    if (!post) res.status(404).json('no such post')
    else res.json(post)
}

async function loadPosts(req, res) {
    if (req.query.query === undefined) {
        console.log('making sure this is hit')
        const posts = await req.db.findMany('Post', {
            where: {
                // status: 1,
                topic: '',
            },
        })
        res.json(posts)
        console.log(posts)
        return
    }

    const { topic } = req.query
    const query = req.query.query.toString()
    // TODO: deal with this when there's an offset arg
    // const lastRead = req.query.lastRead || 0
    const epks = req.query.epks ? req.query.epks.split('_') : undefined
    const lastRead = req.query.lastRead ? req.query.lastRead.split('_') : []

    const posts = (
        await req.db.findMany('Post', {
            where: {
                epochKey: epks,
                topic,
            },
            orderBy: {
                createdAt: query === QueryType.New ? 'desc' : undefined,
                posRep: query === QueryType.Boost ? 'desc' : undefined,
                negRep: query === QueryType.Squash ? 'desc' : undefined,
                totalRep: query === QueryType.Rep ? 'desc' : undefined,
                commentCount: query === QueryType.Comments ? 'desc' : undefined,
            },
        })
    ).filter((p) => !lastRead.includes(p._id))

    res.json(posts.slice(0, Math.min(LOAD_POST_COUNT, posts.length)))
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
    const { publicSignals, proof, title, content, topic } = req.body

    const reputationProof = new ReputationProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof)
    )
    const epochKey = reputationProof.epochKey.toString()
    const minRep = Number(reputationProof.minRep)
    const hashedContent = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(TITLE_LABEL + title + TITLE_LABEL + content)
    )

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

    const calldata = unirepSocialContract.interface.encodeFunctionData(
        'publishPost',
        [hashedContent, reputationProof.publicSignals, reputationProof.proof]
    )
    const hash = await TransactionManager.queueTransaction(
        unirepSocialContract.address,
        {
            data: calldata,
            value: attestingFee,
        }
    )
    // adding topic when creating this post
    const post = await req.db.create('Post', {
        content,
        hashedContent,
        title,
        topic,
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
        data: post._id,
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
    const { publicSignals, proof, title, content, topic } = req.body

    const subsidyProof = new SubsidyProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof),
        Prover
    )
    const hashedContent = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(TITLE_LABEL + title + TITLE_LABEL + content)
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

    const calldata = unirepSocialContract.interface.encodeFunctionData(
        'publishPostSubsidy',
        [hashedContent, subsidyProof.publicSignals, subsidyProof.proof]
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
        hashedContent,
        title,
        topic,
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
        data: post._id,
        transactionHash: hash,
        confirmed: 0,
        spentFromSubsidy: true,
    })

    res.json({
        transaction: hash,
        currentEpoch: currentEpoch,
        post,
    })
}

async function editPost(req, res) {
    const id = req.params.id
    const { publicSignals, proof, title, content } = req.body

    const { transaction, error } = await editPostOnChain(
        id,
        req.db,
        publicSignals,
        proof,
        title,
        content
    )

    if (error !== undefined) {
        res.status(422).json({
            error,
        })
    } else {
        const post = await req.db.findOne('Post', { where: { _id: id } })
        const unirepContract = new ethers.Contract(
            UNIREP,
            UNIREP_ABI,
            DEFAULT_ETH_PROVIDER
        )
        const currentEpoch = Number(await unirepContract.currentEpoch())
        await req.db.create('Record', {
            to: post.epochKey,
            from: post.epochKey,
            upvote: 0,
            downvote: 0,
            epoch: currentEpoch,
            action: ActionType.EditPost,
            data: id,
            transactionHash: transaction,
            confirmed: 0,
            spentFromSubsidy: false,
        })
        res.json({
            error,
            transaction,
            post,
        })
    }
}

async function deletePost(req, res) {
    const id = req.params.id
    const { publicSignals, proof } = req.body

    const { transaction, error } = await editPostOnChain(
        id,
        req.db,
        publicSignals,
        proof,
        '',
        DELETED_CONTENT
    )

    if (error !== undefined) {
        res.status(422).json({
            error,
        })
    } else {
        const post = await req.db.findOne('Post', { where: { _id: id } })
        const unirepContract = new ethers.Contract(
            UNIREP,
            UNIREP_ABI,
            DEFAULT_ETH_PROVIDER
        )
        const currentEpoch = Number(await unirepContract.currentEpoch())
        await req.db.create('Record', {
            to: post.epochKey,
            from: post.epochKey,
            upvote: 0,
            downvote: 0,
            epoch: currentEpoch,
            action: ActionType.DeletePost,
            data: id,
            transactionHash: transaction,
            confirmed: 0,
            spentFromSubsidy: false,
        })
        res.json({
            error,
            transaction,
            post,
        })
    }
}

async function editPostOnChain(id, db, publicSignals, proof, title, content) {
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
        ethers.utils.toUtf8Bytes(TITLE_LABEL + title + TITLE_LABEL + content)
    )

    const {
        hashedContent: oldHashedContent,
        onChainId,
        epoch,
        epochKey,
    } = await db.findOne('Post', {
        where: {
            _id: id,
        },
    })

    const error = await verifyEpochKeyProof(db, epkProof, epoch, epochKey)
    if (error !== undefined) {
        return { error }
    }

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

    await db.update('Post', {
        where: {
            _id: id,
            onChainId,
            hashedContent: oldHashedContent,
        },
        update: {
            title,
            content,
            hashedContent: newHashedContent,
            lastUpdatedAt: +new Date(),
        },
    })

    return { transaction: hash, error }
}
