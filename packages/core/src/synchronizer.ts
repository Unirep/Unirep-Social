import { DB, TransactionDB } from 'anondb'
import { ethers } from 'ethers'
import { Prover } from '@unirep/circuits'
import { Synchronizer } from '@unirep/core'

export enum ActionType {
    Post = 'Post',
    Comment = 'Comment',
    Vote = 'Vote',
    UST = 'UST',
    Signup = 'Signup',
}

export interface UnirepSocialConfig {
    postRep: number
    commentRep: number
    airdropRep: number
}

export class UnirepSocialSynchronizer extends Synchronizer {
    socialConfig: UnirepSocialConfig
    unirepSocialContract: ethers.Contract

    constructor(
        db: DB,
        prover: Prover,
        unirepContract: ethers.Contract,
        unirepSocialContract: ethers.Contract,
        config: UnirepSocialConfig = {
            postRep: 5,
            commentRep: 3,
            airdropRep: 30,
        }
    ) {
        super(db, prover, unirepContract as any)
        this.unirepSocialContract = unirepSocialContract
        this.socialConfig = config
    }

    async loadNewEvents(fromBlock, toBlock) {
        return (
            (await Promise.all([
                this.unirepContract.queryFilter(
                    this.unirepFilter,
                    fromBlock,
                    toBlock
                ),
                this.unirepSocialContract.queryFilter(
                    this.unirepSocialFilter,
                    fromBlock,
                    toBlock
                ),
            ])) as any
        ).flat()
    }

    get topicHandlers(): any {
        const [_UserSignedUp] = this.unirepSocialContract.filters.UserSignedUp()
            .topics as string[]
        const [_PostSubmitted] =
            this.unirepSocialContract.filters.PostSubmitted().topics as string[]
        const [_CommentSubmitted] =
            this.unirepSocialContract.filters.CommentSubmitted()
                .topics as string[]
        const [_ContentUpdated] =
            this.unirepSocialContract.filters.ContentUpdated()
                .topics as string[]
        const [_VoteSubmitted] =
            this.unirepSocialContract.filters.VoteSubmitted().topics as string[]
        const [_AirdropSubmitted] =
            this.unirepSocialContract.filters.AirdropSubmitted()
                .topics as string[]
        return {
            ...super.topicHandlers,
            [_UserSignedUp]: this.socialUserSignedUp.bind(this),
            [_PostSubmitted]: this.postSubmittedEvent.bind(this),
            [_CommentSubmitted]: this.commentSubmittedEvent.bind(this),
            [_ContentUpdated]: this.contentUpdatedEvent.bind(this),
            [_VoteSubmitted]: this.voteSubmittedEvent.bind(this),
            [_AirdropSubmitted]: this.airdropSubmittedEvent.bind(this),
        }
    }

    get unirepSocialFilter() {
        const [_UserSignedUp] = this.unirepSocialContract.filters.UserSignedUp()
            .topics as string[]
        const [_PostSubmitted] =
            this.unirepSocialContract.filters.PostSubmitted().topics as string[]
        const [_CommentSubmitted] =
            this.unirepSocialContract.filters.CommentSubmitted()
                .topics as string[]
        const [_ContentUpdated] =
            this.unirepSocialContract.filters.ContentUpdated()
                .topics as string[]
        const [_VoteSubmitted] =
            this.unirepSocialContract.filters.VoteSubmitted().topics as string[]
        const [_AirdropSubmitted] =
            this.unirepSocialContract.filters.AirdropSubmitted()
                .topics as string[]
        // Unirep Social events
        return {
            address: this.unirepSocialContract.address,
            topics: [
                [
                    _UserSignedUp,
                    _PostSubmitted,
                    _CommentSubmitted,
                    _ContentUpdated,
                    _VoteSubmitted,
                    _AirdropSubmitted,
                ],
            ],
        }
    }

    async socialUserSignedUp(event, db) {
        // const _epoch = Number(event.topics[1])
        // const _commitment = BigInt(event.topics[2]).toString()
        // db.create('UserSignUp', {
        //     transactionHash: event.transactionHash,
        //     commitment: _commitment,
        //     epoch: _epoch,
        // })
    }

    async commentSubmittedEvent(event: ethers.Event, db: TransactionDB) {
        const decodedData = this.unirepSocialContract.interface.decodeEventLog(
            'CommentSubmitted',
            event.data
        )
        const transactionHash = event.transactionHash
        const onChainPostId = BigInt(event.topics[2]).toString()
        const epoch = Number(event.topics[1])
        const epochKey = BigInt(event.topics[3]).toString(10)
        const onChainCommentId = decodedData._commentId.toString()
        const findComment = await this._db.findOne('Comment', {
            where: {
                transactionHash,
            },
        })
        const minRep = decodedData.minRep.toNumber()
        const hashedContent = decodedData._contentHash
        const { _id: postId } = await this._db.findOne('Post', {
            where: {
                onChainId: onChainPostId,
            },
        })

        if (findComment) {
            db.update('Comment', {
                where: {
                    _id: findComment._id,
                    hashedContent,
                },
                update: {
                    status: 1,
                    transactionHash,
                    onChainId: onChainCommentId,
                },
            })
        } else {
            db.create('Comment', {
                transactionHash,
                postId,
                onChainId: onChainCommentId,
                hashedContent,
                epochKey,
                epoch,
                proveMinRep: minRep !== 0 ? true : false,
                minRep,
                posRep: 0,
                negRep: 0,
                status: 1,
            })
        }
        // we can safely increment the comment count by finding all comments
        // and setting the value here because we're in a tx lock
        const commentCount = await this._db.count('Comment', {
            postId,
        })
        db.update('Post', {
            where: {
                _id: postId,
            },
            update: {
                // add one for the current comment we're updating
                // if comment router saved the comment before, commentCount should be 1
                // otherwise, commentCount would be 0
                commentCount: commentCount + (findComment ? 0 : 1),
            },
        })
        db.upsert('Record', {
            where: {
                transactionHash,
            },
            update: {
                confirmed: 1,
            },
            create: {
                to: epochKey,
                from: epochKey,
                upvote: 0,
                downvote: this.socialConfig.commentRep,
                epoch,
                action: ActionType.Comment,
                transactionHash,
                data: findComment?._id ?? '',
                confirmed: 1,
            },
        })
    }
    async postSubmittedEvent(event: ethers.Event, db: TransactionDB) {
        const transactionHash = event.transactionHash
        const findPost = await this._db.findOne('Post', {
            where: {
                transactionHash,
            },
        })

        const decodedData = this.unirepSocialContract.interface.decodeEventLog(
            'PostSubmitted',
            event.data
        )
        const onChainId = BigInt(event.topics[2]).toString()
        const epoch = Number(event.topics[1])
        const epochKey = BigInt(event.topics[3]).toString(10)
        const minRep = decodedData.minRep.toNumber()
        const hashedContent = decodedData._contentHash

        if (findPost) {
            db.update('Post', {
                where: {
                    _id: findPost._id,
                    hashedContent,
                },
                update: {
                    status: 1,
                    onChainId,
                },
            })
        } else {
            db.create('Post', {
                onChainId,
                transactionHash,
                hashedContent,
                epochKey,
                epoch,
                proveMinRep: minRep !== 0 ? true : false,
                minRep,
                posRep: 0,
                negRep: 0,
                status: 1,
            })
        }
        db.upsert('Record', {
            where: {
                transactionHash,
            },
            update: {
                confirmed: 1,
            },
            create: {
                to: epochKey,
                from: epochKey,
                upvote: 0,
                downvote: this.socialConfig.postRep,
                epoch,
                action: ActionType.Post,
                transactionHash,
                data: findPost?._id ?? '',
                confirmed: 1,
            },
        })
    }

    async contentUpdatedEvent(event: ethers.Event, db: TransactionDB) {
        const decodedData = this.unirepSocialContract.interface.decodeEventLog(
            'ContentUpdated',
            event.data
        )
        const onChainId = event.topics[1].toString()
        const oldContentHash = decodedData._oldContentHash
        const newContentHash = decodedData._newContentHash

        db.update('Post', {
            where: {
                onChainId,
                hashedContent: oldContentHash,
            },
            update: {
                hashedContent: newContentHash,
            },
        })

        db.update('Comment', {
            where: {
                onChainId,
                hashedContent: oldContentHash,
            },
            update: {
                hashedContent: newContentHash,
            },
        })
    }

    async voteSubmittedEvent(event: ethers.Event, db: TransactionDB) {
        const decodedData = this.unirepSocialContract.interface.decodeEventLog(
            'VoteSubmitted',
            event.data
        )
        const _transactionHash = event.transactionHash
        const _epoch = Number(event.topics[1])
        const _fromEpochKey = BigInt(event.topics[2]).toString(10)
        const _toEpochKey = BigInt(event.topics[3]).toString(10)

        const _posRep = Number(decodedData.upvoteValue._hex)
        const _negRep = Number(decodedData.downvoteValue._hex)

        const findVote = await this._db.findOne('Vote', {
            where: { transactionHash: _transactionHash },
        })
        if (findVote) {
            db.update('Vote', {
                where: {
                    _id: findVote._id,
                },
                update: {
                    status: 1,
                    transactionHash: _transactionHash,
                },
            })
            // TODO: refactor this
            // if (findVote.postId) {
            //     await Post.updateOne(
            //         {
            //             transactionHash: findVote.postId,
            //         },
            //         {
            //             $inc: {
            //                 posRep: findVote.posRep,
            //                 negRep: findVote.negRep,
            //                 totalRep: findVote.negRep + findVote.posRep,
            //             },
            //         }
            //     )
            // } else if (findVote.commentId) {
            //     await Comment.updateOne(
            //         {
            //             transactionHash: findVote.commentId,
            //         },
            //         {
            //             $inc: {
            //                 posRep: findVote.posRep,
            //                 negRep: findVote.negRep,
            //                 totalRep: findVote.negRep + findVote.posRep,
            //             },
            //         }
            //     )
            // }
        } else {
            db.create('Vote', {
                transactionHash: _transactionHash,
                epoch: _epoch,
                voter: _fromEpochKey,
                receiver: _toEpochKey,
                posRep: _posRep,
                negRep: _negRep,
                graffiti: '0',
                overwriteGraffiti: false,
                postId: '',
                commentId: '',
                status: 1,
            })
        }

        db.upsert('Record', {
            where: {
                transactionHash: _transactionHash,
            },
            update: {
                confirmed: 1,
            },
            create: {
                to: _toEpochKey,
                from: _fromEpochKey,
                upvote: _posRep,
                downvote: _negRep,
                epoch: _epoch,
                action: ActionType.Vote,
                transactionHash: _transactionHash,
                data: findVote?.postId ?? findVote?.commentId ?? '',
                confirmed: 1,
            },
        })
    }

    async airdropSubmittedEvent(event: ethers.Event, db: TransactionDB) {
        const decodedData = this.unirepSocialContract.interface.decodeEventLog(
            'AirdropSubmitted',
            event.data
        )
        const _transactionHash = event.transactionHash
        const _epoch = Number(event.topics[1])
        const _epochKey = BigInt(event.topics[2]).toString(10)

        db.create('Record', {
            to: _epochKey,
            from: 'UnirepSocial',
            upvote: this.socialConfig.airdropRep,
            downvote: 0,
            epoch: _epoch,
            action: 'UST',
            data: '0',
            transactionHash: event.transactionHash,
        })
    }
}
