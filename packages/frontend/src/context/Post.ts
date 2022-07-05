import { createContext } from 'react'
import { makeAutoObservable } from 'mobx'

import { Post, Comment, QueryType, Vote, Draft, DataType } from '../constants'
import { makeURL, convertDataToPost, convertDataToComment } from '../utils'
import UserContext, { User } from './User'
import QueueContext, { Queue, ActionType, Metadata } from './Queue'
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

    constructor() {
        makeAutoObservable(this)
        if (typeof window !== 'undefined') {
            this.load()
        }
    }

    // must be called in browser, not in SSR
    load() {
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
        const apiURL = makeURL(`post/${id}`, {})
        const r = await fetch(apiURL)
        const data = await r.json()
        const post = convertDataToPost(data[0])
        this.ingestPosts(post)
    }

    async loadFeed(query: string, lastRead = '0', epks = [] as string[]) {
        const apiURL = makeURL(`post`, {
            query,
            lastRead,
            epks: epks.join('_'),
        })
        const r = await fetch(apiURL)
        const data = await r.json()
        const posts = data.map((p: any) => convertDataToPost(p)) as Post[]
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

    async loadComments(query: string, lastRead = '0', epks = [] as string[]) {
        const apiURL = makeURL(`comment`, {
            query,
            lastRead,
            epks: epks.join('_'),
        })
        const r = await fetch(apiURL)
        const data = await r.json()
        const comments = data.map((p: any) =>
            convertDataToComment(p)
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
        const comments = _comments.map(convertDataToComment) as Comment[]
        this.ingestComments(comments)
        this.commentsByPostId[postId] = comments.map((c) => c.id)
    }

    async loadComment(commentId: string) {
        const r = await fetch(makeURL(`comment/${commentId}`))
        const comment = await r.json()
        if (comment === null) return
        this.ingestComments(convertDataToComment(comment))
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
        const votes = await r.json()
        if (votes === null) return
        this.ingestVotes(votes as Vote[])
        this.votesByPostId[postId] = votes.map((v: Vote) => v._id)
    }

    getAirdrop() {
        queueContext.addOp(
            async (update) => {
                if (!userContext.userState) return false

                update({
                    title: 'Waiting to generate Airdrop',
                    details: 'Synchronizing with blockchain...',
                })

                console.log('before userContext wait for sync')
                await userContext.waitForSync()
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
        const user = (UserContext as any)._currentValue

        queueContext.addOp(
            async (updateStatus) => {
                updateStatus({
                    title: 'Creating post',
                    details: 'Generating zk proof...',
                })
                const { proof, publicSignals } = await user.genRepProof(
                    unirepConfig.postReputation,
                    epkNonce,
                    minRep
                )
                updateStatus({
                    title: 'Creating post',
                    details: 'Waiting for TX inclusion...',
                })
                const apiURL = makeURL('post', {})
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
                const post = convertDataToPost(_post)
                this.postsById[post.id] = post
                this.feedsByQuery[QueryType.New].unshift(post.id)
                this.postDraft = { title: '', content: '' }
                this.save()

                return { id: transaction, transactionId: transaction }
            },
            {
                successMessage: 'Post is finalized',
                type: ActionType.Post,
            }
        )
    }

    vote(
        postId: string = '',
        commentId: string = '',
        receiver: string,
        epkNonce: number = 0,
        upvote: number = 0,
        downvote: number = 0,
        minRep = 0
    ) {
        queueContext.addOp(
            async (updateStatus) => {
                updateStatus({
                    title: 'Creating Vote',
                    details: 'Generating ZK proof...',
                })
                const { proof, publicSignals } = await userContext.genRepProof(
                    upvote + downvote,
                    epkNonce,
                    Math.max(upvote + downvote, minRep)
                )
                updateStatus({
                    title: 'Creating Vote',
                    details: 'Broadcasting vote...',
                })
                const r = await fetch(makeURL('vote'), {
                    headers: {
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify({
                        upvote,
                        downvote,
                        proof,
                        minRep: Math.max(upvote + downvote, minRep),
                        publicSignals,
                        receiver,
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
                const { proof, publicSignals } = await userContext.genRepProof(
                    unirepConfig.commentReputation,
                    epkNonce,
                    minRep
                )
                updateStatus({
                    title: 'Creating comment',
                    details: 'Waiting for transaction...',
                })
                const r = await fetch(makeURL('comment'), {
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
                const { transaction, error } = await r.json()
                if (error) throw error
                await queueContext.afterTx(transaction)
                await Promise.all([
                    this.loadCommentsByPostId(postId),
                    this.loadPost(postId),
                ])

                this.commentDraft = { title: '', content: '' }
                this.save()

                return {
                    id: postId + '#' + transaction,
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

    setDraft(type: DataType, title: string = '', content: string = '') {
        if (type === DataType.Post) {
            this.postDraft = { title, content }
        } else if (type === DataType.Comment) {
            this.commentDraft = { title, content }
        }
        this.save()
    }
}

export default createContext(new Data())
