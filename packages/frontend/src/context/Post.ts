import { createContext } from 'react'
import { makeAutoObservable } from 'mobx'
import { ActionType } from '@unirep-social/core'

import { Post, Comment, QueryType, Vote, Draft, DataType } from '../constants'
import { makeURL } from '../utils'
import UserContext, { User } from './User'
import QueueContext, { Queue, Metadata } from './Queue'
import UnirepContext, { UnirepConfig } from './Unirep'

const queueContext = (QueueContext as any)._currentValue as Queue
const userContext = (UserContext as any)._currentValue as User
const unirepConfig = (UnirepContext as any)._currentValue as UnirepConfig

export class Data {
    commentsById = {} as { [id: string]: Comment }
    postsById = {} as { [id: string]: Post }
    feedsByQuery = {} as { [query: string]: string[] }
    commentsByPostId = {} as { [postId: string]: string[] }
    commentsByQuery = {} as { [commentId: string]: string[] }
    votesById = {} as { [id: string]: Vote }
    votesByCommentId = {} as { [commentId: string]: string[] }
    votesByPostId = {} as { [commentId: string]: string[] }
    postDraft: Draft = { title: '', content: '' }
    commentDraft: Draft = { title: '', content: '' }
    loadingPromise

    constructor() {
        makeAutoObservable(this)

        if (typeof window !== 'undefined') {
            this.loadingPromise = this.load()
        } else {
            this.loadingPromise = Promise.resolve()
        }
    }

    // must be called in browser, not in SSR
    async load() {
        await unirepConfig.loadingPromise

        const storedPostDraft = window.localStorage.getItem('post-draft')
        if (storedPostDraft) {
            this.postDraft = JSON.parse(storedPostDraft)
        }

        const storedCommentDraft = window.localStorage.getItem('comment-draft')
        if (storedCommentDraft) {
            this.commentDraft = JSON.parse(storedCommentDraft)
        }
    }

    save() {
        window.localStorage.setItem(
            'post-draft',
            JSON.stringify(this.postDraft)
        )
        window.localStorage.setItem(
            'comment-draft',
            JSON.stringify(this.commentDraft)
        )
    }

    private convertEpochKeyToHexString(epochKey: string) {
        return BigInt(epochKey)
            .toString(16)
            .padStart(unirepConfig.epochTreeDepth / 4, '0')
    }

    private ingestPosts(_posts: Post | Post[]) {
        const posts = [_posts].flat()
        for (const post of posts) {
            this.postsById[post.id] = post
        }
    }

    private ingestComments(_comments: Comment | Comment[]) {
        const comments = [_comments].flat()
        for (const comment of comments) {
            this.commentsById[comment.id] = comment
        }
    }

    private ingestVotes(_votes: Vote | Vote[]) {
        const votes = [_votes].flat()
        for (const vote of votes) {
            this.votesById[vote._id] = vote
        }
    }

    feedKey(query: string, epks = [] as string[]) {
        return epks.length === 0 ? query : `${query}-user`
    }

    async loadPost(id: string) {
        await unirepConfig.loadingPromise

        const apiURL = makeURL(`post/${id}`, {})
        const r = await fetch(apiURL)
        const data = await r.json()
        const post = this.convertDataToPost(data)
        this.ingestPosts(post)
    }

    async loadFeed(
        query: string,
        lastRead = [] as string[],
        epks = [] as string[]
    ) {
        await unirepConfig.loadingPromise

        const epksBase10 = epks.map((epk) => BigInt('0x' + epk).toString())
        const apiURL = makeURL(`post`, {
            query,
            lastRead: lastRead.join('_'),
            epks: epksBase10.join('_'),
        })
        const r = await fetch(apiURL)
        const data = await r.json()
        const posts = data.map((p: any) => this.convertDataToPost(p)) as Post[]
        this.ingestPosts(posts)
        const key = this.feedKey(query, epks)
        if (!this.feedsByQuery[key]) {
            this.feedsByQuery[key] = []
        }
        const ids = {} as { [key: string]: boolean }
        const postIds = posts.map((p) => p.id)
        this.feedsByQuery[key] = [...this.feedsByQuery[key], ...postIds].filter(
            (id) => {
                if (ids[id]) return false
                ids[id] = true
                return true
            }
        )
    }

    async loadComments(
        query: string,
        lastRead = [] as string[],
        epks = [] as string[]
    ) {
        await unirepConfig.loadingPromise

        const epksBase10 = epks.map((epk) => Number('0x' + epk))
        const apiURL = makeURL(`comment`, {
            query,
            lastRead: lastRead.join('_'),
            epks: epksBase10.join('_'),
        })
        const r = await fetch(apiURL)
        const data = await r.json()
        const comments = data.map((p: any) =>
            this.convertDataToComment(p)
        ) as Comment[]
        const key = this.feedKey(query, epks)
        this.ingestComments(comments)
        if (!this.commentsByQuery[key]) {
            this.commentsByQuery[key] = []
        }
        const ids = {} as { [key: string]: boolean }
        const commentIds = comments.map((c) => c.id)
        this.commentsByQuery[key] = [
            ...this.commentsByQuery[key],
            ...commentIds,
        ].filter((id) => {
            if (ids[id]) return false
            ids[id] = true
            return true
        })
    }

    async loadCommentsByPostId(postId: string) {
        const r = await fetch(makeURL(`post/${postId}/comments`))
        const _comments = await r.json()
        const comments = _comments.map((c: any) =>
            this.convertDataToComment(c)
        ) as Comment[]
        this.ingestComments(comments)
        this.commentsByPostId[postId] = comments.map((c) => c.id)
    }

    async loadComment(commentId: string) {
        const r = await fetch(makeURL(`comment/${commentId}`))
        const comment = await r.json()
        if (comment === null) return
        this.ingestComments(this.convertDataToComment(comment))
    }

    async loadVotesForCommentId(commentId: string) {
        const r = await fetch(makeURL(`comment/${commentId}/votes`))
        const votes = await r.json()
        if (votes === null) return
        this.ingestVotes(votes as Vote[])
        this.votesByCommentId[commentId] = votes.map((v: Vote) => v._id)
    }

    async loadVotesForPostId(postId: string) {
        const r = await fetch(makeURL(`post/${postId}/votes`))
        const votesResult = await r.json()
        if (votesResult === null) return

        const votes = (votesResult as Vote[]).map((vote) => {
            return {
                ...vote,
                voter: this.convertEpochKeyToHexString(vote.voter),
            }
        })
        this.ingestVotes(votes)
        this.votesByPostId[postId] = votes.map((v: Vote) => v._id)
    }

    getAirdrop(blockNumber?: number) {
        queueContext.addOp(
            async (update) => {
                if (!userContext.userState) return false

                update({
                    title: 'Waiting to generate Airdrop',
                    details: 'Synchronizing with blockchain...',
                })

                console.log('before userContext wait for sync')
                await userContext.userState?.waitForSync(blockNumber)
                console.log('sync complete')

                await userContext.calculateAllEpks()
                update({
                    title: 'Creating Airdrop',
                    details: 'Generating ZK proof...',
                })

                const { transaction, error } = await userContext.getAirdrop()
                if (error) throw error

                update({
                    title: 'Creating Airdrop',
                    details: 'Waiting for TX inclusion...',
                })
                await queueContext.afterTx(transaction)

                let metadata: Metadata = { transactionId: transaction }
                return metadata
            },
            {
                type: ActionType.UST,
            }
        )
    }

    publishPost(
        title: string = '',
        content: string = '',
        epkNonce: number = 0,
        minRep = 0
    ) {
        queueContext.addOp(
            async (updateStatus) => {
                updateStatus({
                    title: 'Creating post',
                    details: 'Generating zk proof...',
                })
                // if the epk nonce is a positive value then we generate a rep
                // proof, otherwise we generate a subsidy proof
                const { proof, publicSignals } = await (epkNonce >= 0
                    ? userContext.genRepProof(
                          unirepConfig.postReputation,
                          epkNonce,
                          minRep
                      )
                    : userContext.genSubsidyProof(minRep))
                updateStatus({
                    title: 'Creating post',
                    details: 'Waiting for TX inclusion...',
                })
                const apiURL = makeURL(
                    epkNonce >= 0 ? 'post' : 'post/subsidy',
                    {}
                )
                const r = await fetch(apiURL, {
                    headers: {
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify({
                        title,
                        content,
                        proof,
                        proveKarma: unirepConfig.postReputation,
                        publicSignals,
                    }),
                    method: 'POST',
                })
                const { transaction, error, post: _post } = await r.json()
                if (error) throw error
                await queueContext.afterTx(transaction)
                const post = this.convertDataToPost(_post)
                this.postsById[post.id] = post
                this.feedsByQuery[QueryType.New].unshift(post.id)
                this.postDraft = { title: '', content: '' }
                this.save()
                await userContext.loadReputation()
                await userContext.loadRecords()

                return { id: post.id, transactionId: transaction }
            },
            {
                successMessage: 'Post is finalized',
                type: ActionType.Post,
            }
        )
    }

    editPost(
        postId: string = '',
        title: string = '',
        content: string = '',
        epk: string = ''
    ) {
        const i = userContext.allEpks.findIndex((e) => e === epk)
        const epoch = i / unirepConfig.numEpochKeyNoncePerEpoch + 1
        const epkNonce = i % unirepConfig.numEpochKeyNoncePerEpoch

        queueContext.addOp(
            async (updateStatus) => {
                if (userContext && userContext.userState) {
                    updateStatus({
                        title: 'Updating post',
                        details: 'Generating zk proof...',
                    })
                    const { publicSignals, proof } =
                        await userContext.userState.genVerifyEpochKeyProof(
                            epkNonce,
                            epoch
                        )
                    updateStatus({
                        title: 'Updating post',
                        details: 'Waiting for TX inclusion...',
                    })
                    const apiURL = makeURL(`post/edit/${postId}`)
                    const r = await fetch(apiURL, {
                        headers: {
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            title,
                            content,
                            proof,
                            publicSignals,
                        }),
                        method: 'POST',
                    })
                    const { transaction, error, post: _post } = await r.json()
                    if (error) throw error
                    await queueContext.afterTx(transaction)
                    const post = this.convertDataToPost(_post)
                    this.postsById[post.id] = post
                    this.save()

                    return { id: post.id, transactionId: transaction }
                }
            },
            {
                successMessage: 'Update post is finalized',
                type: ActionType.EditPost,
                metadata: { id: postId },
            }
        )
    }

    deletePost(postId: string = '', epk: string = '') {
        const i = userContext.allEpks.findIndex((e) => e === epk)
        const epoch = i / unirepConfig.numEpochKeyNoncePerEpoch + 1
        const epkNonce = i % unirepConfig.numEpochKeyNoncePerEpoch

        queueContext.addOp(
            async (updateStatus) => {
                if (userContext && userContext.userState) {
                    updateStatus({
                        title: 'Deleting post',
                        details: 'Generating zk proof...',
                    })
                    const { publicSignals, proof } =
                        await userContext.userState.genVerifyEpochKeyProof(
                            epkNonce,
                            epoch
                        )
                    updateStatus({
                        title: 'Deleting post',
                        details: 'Waiting for TX inclusion...',
                    })
                    const apiURL = makeURL(`post/delete/${postId}`)
                    const r = await fetch(apiURL, {
                        headers: {
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            proof,
                            publicSignals,
                        }),
                        method: 'POST',
                    })
                    const { transaction, error, post: _post } = await r.json()
                    if (error) throw error
                    await queueContext.afterTx(transaction)
                    const post = this.convertDataToPost(_post)
                    this.postsById[post.id] = post
                    this.save()

                    return { id: post.id, transactionId: transaction }
                }
            },
            {
                successMessage: 'Delete post is finalized',
                type: ActionType.DeletePost,
                metadata: { id: postId },
            }
        )
    }

    vote(
        postId: string = '',
        commentId: string = '',
        _receiver: string,
        epkNonce: number = 0,
        upvote: number = 0,
        downvote: number = 0,
        minRep = 0
    ) {
        const receiverIn10 = BigInt('0x' + _receiver).toString(10)
        queueContext.addOp(
            async (updateStatus) => {
                updateStatus({
                    title: 'Creating Vote',
                    details: 'Generating ZK proof...',
                })
                const { proof, publicSignals } = await (epkNonce >= 0
                    ? userContext.genRepProof(
                          upvote + downvote,
                          epkNonce,
                          minRep
                      )
                    : userContext.genSubsidyProof(
                          minRep,
                          `0x${_receiver.replace('0x', '')}`
                      ))
                updateStatus({
                    title: 'Creating Vote',
                    details: 'Broadcasting vote...',
                })
                const receiver = _receiver.startsWith('0x')
                    ? parseInt(_receiver, 16).toString()
                    : _receiver
                const url = makeURL(epkNonce >= 0 ? 'vote' : 'vote/subsidy')
                const r = await fetch(url, {
                    headers: {
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify({
                        upvote,
                        downvote,
                        proof,
                        minRep,
                        publicSignals,
                        receiver: receiverIn10,
                        dataId: postId.length > 0 ? postId : commentId,
                        isPost: !!postId,
                    }),
                    method: 'POST',
                })
                const { error, transaction } = await r.json()
                if (error) throw error
                updateStatus({
                    title: 'Creating Vote',
                    details: 'Waiting for transaction...',
                })
                await queueContext.afterTx(transaction)

                if (postId) await this.loadPost(postId)
                if (commentId) await this.loadComment(commentId)
                await userContext.loadReputation()
                await userContext.loadRecords()

                return {
                    id: postId ? postId : commentId,
                    transactionId: transaction,
                }
            },
            {
                type: ActionType.Vote,
                metadata: { id: postId ? postId : commentId },
            }
        )
    }

    leaveComment(
        content: string,
        postId: string,
        epkNonce: number = 0,
        minRep = 0
    ) {
        queueContext.addOp(
            async (updateStatus) => {
                updateStatus({
                    title: 'Creating comment',
                    details: 'Generating ZK proof...',
                })
                const { proof, publicSignals } = await (epkNonce >= 0
                    ? userContext.genRepProof(
                          unirepConfig.commentReputation,
                          epkNonce,
                          minRep
                      )
                    : userContext.genSubsidyProof(minRep))
                updateStatus({
                    title: 'Creating comment',
                    details: 'Waiting for transaction...',
                })
                const url = makeURL(
                    epkNonce >= 0 ? 'comment' : 'comment/subsidy'
                )
                const r = await fetch(url, {
                    headers: {
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify({
                        content,
                        proof,
                        minRep,
                        postId,
                        publicSignals,
                    }),
                    method: 'POST',
                })
                const { transaction, error, comment } = await r.json()
                if (error) throw error
                await queueContext.afterTx(transaction)
                await Promise.all([
                    this.loadCommentsByPostId(postId),
                    this.loadPost(postId),
                ])

                this.commentDraft = { title: '', content: '' }
                this.save()
                await userContext.loadReputation()
                await userContext.loadRecords()

                return {
                    id: comment._id,
                    transactionId: transaction,
                }
            },
            {
                successMessage: 'Comment is finalized!',
                type: ActionType.Comment,
                metadata: { id: postId },
            }
        )
    }

    editComment(
        commentId: string = '',
        content: string = '',
        epk: string = ''
    ) {
        const i = userContext.allEpks.findIndex((e) => e === epk)
        const epoch = i / unirepConfig.numEpochKeyNoncePerEpoch + 1
        const epkNonce = i % unirepConfig.numEpochKeyNoncePerEpoch

        queueContext.addOp(
            async (updateStatus) => {
                if (userContext && userContext.userState) {
                    updateStatus({
                        title: 'Updating comment',
                        details: 'Generating zk proof...',
                    })
                    const { publicSignals, proof } =
                        await userContext.userState.genVerifyEpochKeyProof(
                            epkNonce,
                            epoch
                        )
                    updateStatus({
                        title: 'Updating comment',
                        details: 'Waiting for TX inclusion...',
                    })
                    const apiURL = makeURL(`comment/edit/${commentId}`)
                    const r = await fetch(apiURL, {
                        headers: {
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            content,
                            proof,
                            publicSignals,
                        }),
                        method: 'POST',
                    })
                    const {
                        transaction,
                        error,
                        comment: _comment,
                    } = await r.json()
                    if (error) throw error
                    await queueContext.afterTx(transaction)
                    await Promise.all([
                        this.loadCommentsByPostId(_comment.postId),
                    ])
                    this.save()

                    return {
                        id: _comment._id,
                        transactionId: transaction,
                    }
                }
            },
            {
                successMessage: 'Update comment is finalized',
                type: ActionType.EditComment,
                metadata: { id: commentId },
            }
        )
    }

    deleteComment(commentId: string = '', epk: string = '') {
        const i = userContext.allEpks.findIndex((e) => e === epk)
        const epoch = i / unirepConfig.numEpochKeyNoncePerEpoch + 1
        const epkNonce = i % unirepConfig.numEpochKeyNoncePerEpoch

        queueContext.addOp(
            async (updateStatus) => {
                if (userContext && userContext.userState) {
                    updateStatus({
                        title: 'Deleting comment',
                        details: 'Generating zk proof...',
                    })
                    const { publicSignals, proof } =
                        await userContext.userState.genVerifyEpochKeyProof(
                            epkNonce,
                            epoch
                        )
                    updateStatus({
                        title: 'Deleting comment',
                        details: 'Waiting for TX inclusion...',
                    })
                    const apiURL = makeURL(`comment/delete/${commentId}`)
                    const r = await fetch(apiURL, {
                        headers: {
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            proof,
                            publicSignals,
                        }),
                        method: 'POST',
                    })
                    const {
                        transaction,
                        error,
                        comment: _comment,
                    } = await r.json()
                    if (error) throw error
                    await queueContext.afterTx(transaction)
                    await Promise.all([
                        this.loadCommentsByPostId(_comment.postId),
                    ])
                    this.save()

                    return {
                        id: _comment._id,
                        transactionId: transaction,
                    }
                }
            },
            {
                successMessage: 'Delete comment is finalized',
                type: ActionType.DeleteComment,
                metadata: { id: commentId },
            }
        )
    }

    setDraft(type: DataType, title: string = '', content: string = '') {
        if (type === DataType.Post) {
            this.postDraft = { title, content }
        } else if (type === DataType.Comment) {
            this.commentDraft = { title, content }
        }
        this.save()
    }

    convertDataToComment(data: any) {
        const comment = {
            type: DataType.Comment,
            id: data._id,
            post_id: data.postId,
            content: data.content,
            // votes,
            upvote: data.posRep,
            downvote: data.negRep,
            epoch_key: this.convertEpochKeyToHexString(data.epochKey),
            username: '',
            createdAt: data.createdAt,
            reputation: data.minRep,
            current_epoch: data.epoch,
            proofIndex: data.proofIndex,
            transactionHash: data.transactionHash,
            lastUpdatedAt: data.lastUpdatedAt,
        }

        return comment
    }

    convertDataToPost(data: any) {
        const post: Post = {
            type: DataType.Post,
            id: data._id,
            title: data.title,
            content: data.content,
            // votes,
            upvote: data.posRep,
            downvote: data.negRep,
            epoch_key: this.convertEpochKeyToHexString(data.epochKey),
            username: '',
            createdAt: data.createdAt,
            reputation: data.minRep,
            commentCount: data.commentCount,
            current_epoch: data.epoch,
            proofIndex: data.proofIndex,
            transactionHash: data.transactionHash,
            lastUpdatedAt: data.lastUpdatedAt,
        }

        return post
    }

    logout() {
        this.postDraft = { title: '', content: '' }
        this.commentDraft = { title: '', content: '' }
        this.save()
    }
}

export default createContext(new Data())
