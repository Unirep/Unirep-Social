import { DB, TransactionDB } from 'anondb'
import { ethers } from 'ethers'
import { Synchronizer } from '@unirep/core'
import UNIREP_SOCIAL_ABI from '@unirep-social/core/abi/UnirepSocial.json'
import { constructSchema } from 'anondb/types'
import { MemoryConnector } from 'anondb/web'
import schema from './schema'

export enum ActionType {
    Post = 'Post',
    Comment = 'Comment',
    Vote = 'Vote',
    UST = 'UST',
    Signup = 'Signup',
    Airdrop = 'Airdrop',
    EditPost = 'Edit post',
    DeletePost = 'Delete post',
    EditComment = 'Edit comment',
    DeleteComment = 'Delete comment',
    SetUsername = 'Set username',
}

export interface UnirepSocialConfig {
    postRep: number
    commentRep: number
    airdropRep: number
    epochLength: number
    subsidy: number
}

type EventHandlerArgs = {
    event: ethers.Event
    decodedData: { [key: string]: any }
    db: TransactionDB
}

export class UnirepSocialSynchronizer extends Synchronizer {
    socialConfig = {
        postRep: 5,
        commentRep: 3,
        // airdropRep: 0,
        epochLength: 15 * 60,
        subsidy: 30,
    }
    unirepSocialContract: ethers.Contract

    constructor(config: {
        db?: DB
        unirepSocialAddress: string
        provider: ethers.providers.Provider
        unirepAddress: string
    }) {
        const { db, unirepAddress, provider, unirepSocialAddress } = config
        super({
            db: db ?? new MemoryConnector(constructSchema(schema)),
            unirepAddress,
            provider,
            attesterId: BigInt(unirepSocialAddress),
        })
        this.unirepSocialContract = new ethers.Contract(
            unirepSocialAddress,
            UNIREP_SOCIAL_ABI,
            provider
        )
    }

    get contracts() {
        return {
            ...super.contracts,
            [this.unirepSocialContract.address]: {
                contract: this.unirepSocialContract,
                eventNames: [
                    'AirdropSubmitted',
                    'PostSubmitted',
                    'CommentSubmitted',
                    'ContentUpdated',
                    'VoteSubmitted',
                ],
            },
        }
    }

    async setup() {
        await super.setup()
        this.socialConfig.postRep = (
            await this.unirepSocialContract.postReputation()
        ).toNumber()
        this.socialConfig.commentRep = (
            await this.unirepSocialContract.commentReputation()
        ).toNumber()
        // this.socialConfig.airdropRep = (await this.unirepSocialContract.airdroppedReputation()).toNumber()
        this.socialConfig.epochLength = (
            await this.unirepSocialContract.epochLength()
        ).toNumber()
        this.socialConfig.subsidy = (
            await this.unirepSocialContract.subsidy()
        ).toNumber()
    }

    // async handleUserSignedUp({ event, db, decodedData }: EventHandlerArgs) {
    // const _epoch = Number(event.topics[1])
    // const _commitment = BigInt(event.topics[2]).toString()
    // db.create('UserSignUp', {
    //     transactionHash: event.transactionHash,
    //     commitment: _commitment,
    //     epoch: _epoch,
    // })
    // return true
    // }

    async handleCommentSubmitted({ event, db, decodedData }: EventHandlerArgs) {
        const transactionHash = event.transactionHash
        const onChainPostId = BigInt(event.topics[2]).toString()
        const epoch = Number(event.topics[1])
        const epochKey = BigInt(event.topics[3]).toString()
        const onChainCommentId = decodedData.commentId.toString()
        const findComment = await this.db.findOne('Comment', {
            where: {
                transactionHash,
            },
        })
        const minRep = decodedData.minRep.toNumber()
        const hashedContent = decodedData.contentHash
        const { _id: postId } = await this.db.findOne('Post', {
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
        const commentCount = await this.db.count('Comment', {
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
    async handlePostSubmitted({ event, db, decodedData }: EventHandlerArgs) {
        const transactionHash = event.transactionHash
        const findPost = await this.db.findOne('Post', {
            where: {
                transactionHash,
            },
        })

        const onChainId = BigInt(event.topics[2]).toString()
        const epoch = Number(event.topics[1])
        const epochKey = BigInt(event.topics[3]).toString()
        const minRep = decodedData.minRep.toNumber()
        const hashedContent = decodedData.contentHash

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

    async handleContentUpdated({ event, db, decodedData }: EventHandlerArgs) {
        const onChainId = event.topics[1].toString()
        const oldContentHash = decodedData.oldContentHash
        const newContentHash = decodedData.newContentHash
        const transactionHash = event.transactionHash

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

        db.update('Record', {
            where: {
                transactionHash,
            },
            update: {
                confirmed: 1,
            },
        })
        return true
    }

    async handleVoteSubmitted({ event, db, decodedData }: EventHandlerArgs) {
        const transactionHash = event.transactionHash
        const epoch = Number(event.topics[1])
        const fromEpochKey = BigInt(event.topics[2]).toString()
        const toEpochKey = BigInt(event.topics[3]).toString()

        const posRep = Number(decodedData.upvoteValue._hex)
        const negRep = Number(decodedData.downvoteValue._hex)

        const findVote = await this.db.findOne('Vote', {
            where: { transactionHash },
        })
        if (findVote) {
            db.update('Vote', {
                where: {
                    _id: findVote._id,
                },
                update: {
                    status: 1,
                    transactionHash,
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
                transactionHash,
                epoch,
                voter: fromEpochKey,
                receiver: toEpochKey,
                posRep,
                negRep,
                graffiti: '0',
                overwriteGraffiti: false,
                postId: '',
                commentId: '',
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
                to: toEpochKey,
                from: fromEpochKey,
                upvote: posRep,
                downvote: negRep,
                epoch,
                action: ActionType.Vote,
                transactionHash,
                data: findVote?.postId ?? findVote?.commentId ?? '',
                confirmed: 1,
            },
        })
        return true
    }

    async handleAirdropSubmitted({ event, db, decodedData }: EventHandlerArgs) {
        const transactionHash = event.transactionHash
        const epoch = Number(event.topics[1])
        const epochKey = BigInt(event.topics[2]).toString()

        db.create('Record', {
            to: epochKey,
            from: 'UnirepSocial',
            upvote: this.socialConfig.subsidy,
            downvote: 0,
            epoch,
            action: ActionType.UST,
            data: '0',
            transactionHash,
        })
        return true
    }
}
