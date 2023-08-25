import { Express } from 'express'
import catchError from '../catchError'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'
import { EpochKeyLiteProof } from '@unirep/circuits'
import { ActionProof } from '@unirep-social/circuits'
import { ethers } from 'ethers'
import {
    DEFAULT_POST_REP,
    QueryType,
    LOAD_POST_COUNT,
    TITLE_LABEL,
    DELETED_CONTENT,
} from '../constants'
import {
    verifyEpochKeyLiteProof,
    verifyReputationProof,
    verifySubsidyProof,
} from '../utils'
import TransactionManager from '../daemons/TransactionManager'
import { Prover } from '../daemons/Prover'
import { ActionType } from '../Synchronizer'

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
        const posts = await req.db.findMany('Post', {
            where: {
                status: 1,
            },
        })
        res.json(posts)
        return
    }
    const { topic } = req.query
    const query = req.query.query.toString()
    const epks = req.query.epks ? req.query.epks.split('_') : undefined
    const lastRead = req.query.lastRead ? req.query.lastRead.split('_') : []

    const posts = (
        await req.db.findMany('Post', {
            where: {
                epochKey: epks,
                topic: topic,
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
    const currentEpoch = Number(
        await req.unirep.attesterCurrentEpoch(req.unirepSocial.address)
    )

    // Parse Inputs
    const { publicSignals, proof, title, content, topic } = req.body

    const reputationProof = new ActionProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof),
        Prover
    )
    const epochKey = reputationProof.epochKey.toString()
    const minRep = Number(reputationProof.minRep)
    const hashedContent = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(TITLE_LABEL + title + TITLE_LABEL + content)
    )

    const error = await verifyReputationProof(
        req,
        reputationProof,
        DEFAULT_POST_REP,
        BigInt(req.unirepSocial.address),
        currentEpoch
    )
    if (error !== undefined) {
        res.status(422).json({
            error,
        })
        return
    }

    const calldata = req.unirepSocial.interface.encodeFunctionData(
        'publishPost',
        [hashedContent, reputationProof.publicSignals, reputationProof.proof]
    )
    const hash = await TransactionManager.queueTransaction(
        req.unirepSocial.address,
        {
            data: calldata,
        }
    )

    let graffiti
    const replNonceBits = await req.unirep.replNonceBits()
    const shiftGraffiti =
        BigInt(reputationProof.graffiti) >> BigInt(replNonceBits)
    if (reputationProof.graffiti.toString() !== '0') {
        graffiti = ethers.utils.toUtf8String(
            '0x' + BigInt(shiftGraffiti).toString(16)
        )
    }

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
        graffiti,
    })
    await req.db.create('Record', {
        to: epochKey,
        from: epochKey,
        upvote: 0,
        downvote: DEFAULT_POST_REP,
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
    const currentEpoch = Number(
        await req.unirep.attesterCurrentEpoch(req.unirepSocial.address)
    )

    // Parse Inputs
    const { publicSignals, proof, title, content, topic } = req.body

    const subsidyProof = new ActionProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof),
        Prover
    )
    const hashedContent = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(TITLE_LABEL + title + TITLE_LABEL + content)
    )

    const totalSubsidy = (await req.unirepSocial.subsidy()).toNumber()
    const spentSubsidy = (
        await req.unirepSocial.subsidies(currentEpoch, subsidyProof.epochKey)
    ).toNumber()
    if (spentSubsidy + DEFAULT_POST_REP > totalSubsidy) {
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

    const calldata = req.unirepSocial.interface.encodeFunctionData(
        'publishPostSubsidy',
        [hashedContent, subsidyProof.publicSignals, subsidyProof.proof]
    )
    const epochKey = subsidyProof.epochKey.toString()
    const minRep = subsidyProof.minRep
    const hash = await TransactionManager.queueTransaction(
        req.unirepSocial.address,
        {
            data: calldata,
        }
    )

    let graffiti
    const replNonceBits = await req.unirep.replNonceBits()
    const shiftGraffiti = BigInt(subsidyProof.graffiti) >> BigInt(replNonceBits)
    if (subsidyProof.graffiti.toString() !== '0') {
        graffiti = ethers.utils.toUtf8String(
            '0x' + BigInt(shiftGraffiti).toString(16)
        )
    }
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
        graffiti,
    })

    await req.db.create('Record', {
        to: epochKey,
        from: epochKey,
        upvote: 0,
        downvote: DEFAULT_POST_REP,
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
        req,
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

        const currentEpoch = Number(
            await req.unirep.attesterCurrentEpoch(req.unirepSocial.address)
        )
        await req.db.create('Record', {
            to: post.epochKey.toString(),
            from: post.epochKey.toString(),
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
        req,
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
        const currentEpoch = Number(
            await req.unirep.attesterCurrentEpoch(req.unirepSocial.address)
        )
        await req.db.create('Record', {
            to: post.epochKey.toString(),
            from: post.epochKey.toString(),
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

async function editPostOnChain(id, req, publicSignals, proof, title, content) {
    // Parse Inputs
    const epkProof = new EpochKeyLiteProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof),
        Prover
    )
    const newHashedContent = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(TITLE_LABEL + title + TITLE_LABEL + content)
    )

    const {
        hashedContent: oldHashedContent,
        onChainId,
        epoch,
        epochKey,
    } = await req.db.findOne('Post', {
        where: {
            _id: id,
        },
    })

    const error = await verifyEpochKeyLiteProof(req, epkProof, epoch, epochKey)
    if (error !== undefined) {
        return { error }
    }

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

    await req.db.update('Post', {
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
