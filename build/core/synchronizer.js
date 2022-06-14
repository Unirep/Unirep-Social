"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnirepSocialSynchronizer = exports.ActionType = void 0;
const circuits_1 = require("@unirep/circuits");
const crypto_1 = require("@unirep/crypto");
const core_1 = require("@unirep/core");
const encodeBigIntArray = (arr) => {
    return JSON.stringify(crypto_1.stringifyBigInts(arr));
};
const decodeBigIntArray = (input) => {
    return crypto_1.unstringifyBigInts(JSON.parse(input));
};
var ActionType;
(function (ActionType) {
    ActionType["Post"] = "Post";
    ActionType["Comment"] = "Comment";
    ActionType["Vote"] = "Vote";
    ActionType["UST"] = "UST";
    ActionType["Signup"] = "Signup";
})(ActionType = exports.ActionType || (exports.ActionType = {}));
// For legacy support
const titlePostfix = '</t>';
const titlePrefix = '<t>';
class UnirepSocialSynchronizer extends core_1.Synchronizer {
    constructor(db, prover, unirepContract, unirepSocialContract, config = {
        postRep: 5,
        commentRep: 3,
        airdropRep: 30,
    }) {
        super(db, prover, unirepContract);
        this.unirepSocialContract = unirepSocialContract;
        this.socialConfig = config;
    }
    async loadNewEvents(fromBlock, toBlock) {
        return (await Promise.all([
            super.loadNewEvents(fromBlock, toBlock),
            this.unirepSocialContract.queryFilter(this.unirepSocialFilter, fromBlock, toBlock),
        ])).flat();
    }
    get topicHandlers() {
        const [_UserSignedUp] = this.unirepSocialContract.filters.UserSignedUp()
            .topics;
        const [_PostSubmitted] = this.unirepSocialContract.filters.PostSubmitted().topics;
        const [_CommentSubmitted] = this.unirepSocialContract.filters.CommentSubmitted()
            .topics;
        const [_VoteSubmitted] = this.unirepSocialContract.filters.VoteSubmitted().topics;
        const [_AirdropSubmitted] = this.unirepSocialContract.filters.AirdropSubmitted()
            .topics;
        return {
            ...super.topicHandlers,
            [_UserSignedUp]: this.socialUserSignedUp.bind(this),
            [_PostSubmitted]: this.postSubmittedEvent.bind(this),
            [_CommentSubmitted]: this.commentSubmittedEvent.bind(this),
            [_VoteSubmitted]: this.voteSubmittedEvent.bind(this),
            [_AirdropSubmitted]: this.airdropSubmittedEvent.bind(this),
        };
    }
    get unirepSocialFilter() {
        const [_UserSignedUp] = this.unirepSocialContract.filters.UserSignedUp()
            .topics;
        const [_PostSubmitted] = this.unirepSocialContract.filters.PostSubmitted().topics;
        const [_CommentSubmitted] = this.unirepSocialContract.filters.CommentSubmitted()
            .topics;
        const [_VoteSubmitted] = this.unirepSocialContract.filters.VoteSubmitted().topics;
        const [_AirdropSubmitted] = this.unirepSocialContract.filters.AirdropSubmitted()
            .topics;
        // Unirep Social events
        return {
            address: this.unirepSocialContract.address,
            topics: [
                [
                    _UserSignedUp,
                    _PostSubmitted,
                    _CommentSubmitted,
                    _VoteSubmitted,
                    _AirdropSubmitted,
                ],
            ],
        };
    }
    async socialUserSignedUp(event, db) {
        const _epoch = Number(event.topics[1]);
        const _commitment = BigInt(event.topics[2]).toString();
        db.create('UserSignUp', {
            transactionHash: event.transactionHash,
            commitment: _commitment,
            epoch: _epoch,
        });
    }
    async verifyAttestationProof(index, _epoch, db) {
        const proof = await this._db.findOne('Proof', {
            where: {
                epoch: _epoch,
                index,
            },
        });
        if (!proof)
            throw new Error(`Unable to find attestation proof ${index}`);
        if (proof.event === 'IndexedEpochKeyProof') {
            const publicSignals = decodeBigIntArray(proof.publicSignals);
            const _proof = JSON.parse(proof.proof);
            const valid = await this.prover.verifyProof(circuits_1.Circuit.verifyEpochKey, publicSignals, circuits_1.formatProofForSnarkjsVerification(_proof));
            if (!valid)
                return { isProofValid: false };
        }
        else if (proof.event === 'IndexedReputationProof') {
            const publicSignals = decodeBigIntArray(proof.publicSignals);
            const _proof = JSON.parse(proof.proof);
            const valid = await this.prover.verifyProof(circuits_1.Circuit.proveReputation, publicSignals, circuits_1.formatProofForSnarkjsVerification(_proof));
            if (!valid)
                return { isProofValid: false };
        }
        else if (proof.event === 'IndexedUserSignedUpProof') {
            const publicSignals = decodeBigIntArray(proof.publicSignals);
            const _proof = JSON.parse(proof.proof);
            const valid = await this.prover.verifyProof(circuits_1.Circuit.proveUserSignUp, publicSignals, circuits_1.formatProofForSnarkjsVerification(_proof));
            if (!valid)
                return { isProofValid: false };
        }
        else {
            console.log(`proof index ${index} matches wrong event ${proof.event}`);
            return { isProofValid: false };
        }
        const epoch = Number(_epoch);
        const root = BigInt(proof.globalStateTree).toString();
        const rootEntry = await this._db.findOne('GSTRoot', {
            where: {
                epoch,
                root,
            },
        });
        if (!rootEntry) {
            console.log('Global state tree root does not exist');
            db.update('Proof', {
                where: {
                    epoch,
                    index,
                },
                update: {
                    valid: false,
                },
            });
            return { isProofValid: false };
        }
        return { isProofValid: true };
    }
    async commentSubmittedEvent(event, db) {
        var _a;
        const decodedData = this.unirepSocialContract.interface.decodeEventLog('CommentSubmitted', event.data);
        const _transactionHash = event.transactionHash;
        const commentId = event.transactionHash;
        const postId = event.topics[2];
        const _epoch = Number(event.topics[1]);
        const _epochKey = BigInt(event.topics[3]).toString(16);
        const _minRep = Number(decodedData.proofRelated.minRep._hex);
        const findComment = await this._db.findOne('Comment', {
            where: {
                transactionHash: commentId,
            },
        });
        const reputationProof = decodedData.proofRelated;
        const proofNullifier = await this.unirepContract.hashReputationProof(reputationProof);
        const proofIndex = Number(await this.unirepContract.getProofIndex(proofNullifier));
        const findValidProof = await this._db.findOne('Proof', {
            where: {
                index: proofIndex,
                epoch: _epoch,
            },
        });
        if (!findValidProof) {
            throw new Error('unable to find proof for comment');
        }
        if (findValidProof.valid === false) {
            console.log(`proof index ${proofIndex} is invalid`);
            return;
        }
        {
            const { isProofValid } = await this.verifyAttestationProof(proofIndex, _epoch, db);
            if (isProofValid === false) {
                console.log(`proof index ${proofIndex} is invalid`);
                return;
            }
        }
        const repNullifiers = decodedData.proofRelated.repNullifiers
            .map((n) => BigInt(n).toString())
            .filter((n) => n !== '0');
        const existingNullifier = await this._db.findOne('Nullifier', {
            where: {
                nullifier: repNullifiers,
                confirmed: true,
            },
        });
        if (existingNullifier) {
            console.log(`comment duplicated nullifier`, repNullifiers);
            return;
        }
        // everything checks out, lets start mutating the db
        db.delete('Nullifier', {
            where: {
                nullifier: repNullifiers,
                confirmed: false,
            },
        });
        db.create('Nullifier', repNullifiers.map((nullifier) => ({
            epoch: _epoch,
            nullifier,
        })));
        if (findComment) {
            db.update('Comment', {
                where: {
                    _id: findComment._id,
                },
                update: {
                    status: 1,
                    transactionHash: _transactionHash,
                    proofIndex,
                },
            });
        }
        else {
            db.create('Comment', {
                transactionHash: _transactionHash,
                postId,
                content: decodedData === null || decodedData === void 0 ? void 0 : decodedData.commentContent,
                epochKey: _epochKey,
                proofIndex: proofIndex,
                epoch: _epoch,
                proveMinRep: _minRep !== 0 ? true : false,
                minRep: _minRep,
                posRep: 0,
                negRep: 0,
                status: 1,
            });
        }
        // we can safely increment the comment count by finding all comments
        // and setting the value here because we're in a tx lock
        const commentCount = await this._db.count('Comment', {
            postId,
        });
        db.update('Post', {
            where: {
                transactionHash: postId,
            },
            update: {
                // add one for the current comment we're updating
                commentCount: commentCount + 1,
            },
        });
        db.delete('Record', {
            where: {
                transactionHash: _transactionHash,
                confirmed: false,
            },
        });
        db.create('Record', {
            to: _epochKey,
            from: _epochKey,
            upvote: 0,
            downvote: this.socialConfig.commentRep,
            epoch: _epoch,
            action: ActionType.Comment,
            data: _transactionHash,
            transactionHash: _transactionHash,
        });
        const existingEpkRecord = await this._db.findOne('EpkRecord', {
            where: {
                epk: _epochKey,
                epoch: _epoch,
            },
        });
        if (existingEpkRecord) {
            db.update('EpkRecord', {
                where: {
                    _id: existingEpkRecord._id,
                },
                update: {
                    spent: ((_a = existingEpkRecord === null || existingEpkRecord === void 0 ? void 0 : existingEpkRecord.spent) !== null && _a !== void 0 ? _a : 0) +
                        this.socialConfig.commentRep,
                },
            });
        }
        else {
            db.create('EpkRecord', {
                epk: _epochKey,
                epoch: _epoch,
                spent: this.socialConfig.commentRep,
                posRep: 0,
                negRep: 0,
            });
        }
    }
    async postSubmittedEvent(event, db) {
        var _a, _b;
        const postId = event.transactionHash;
        const findPost = await this._db.findOne('Post', {
            where: {
                transactionHash: postId,
            },
        });
        const decodedData = this.unirepSocialContract.interface.decodeEventLog('PostSubmitted', event.data);
        const reputationProof = decodedData.proofRelated;
        const proofNullifier = await this.unirepContract.hashReputationProof(reputationProof);
        const proofIndex = Number(await this.unirepContract.getProofIndex(proofNullifier));
        const _transactionHash = event.transactionHash;
        const _epoch = Number(event.topics[1]);
        const _epochKey = BigInt(event.topics[2]).toString(16);
        const _minRep = Number(decodedData.proofRelated.minRep._hex);
        const findValidProof = await this._db.findOne('Proof', {
            where: {
                index: proofIndex,
                epoch: _epoch,
            },
        });
        if (!findValidProof) {
            throw new Error('unable to find proof for post');
        }
        if (findValidProof.valid === false) {
            console.log(`proof index ${proofIndex} is invalid`);
            return;
        }
        {
            const { isProofValid } = await this.verifyAttestationProof(proofIndex, _epoch, db);
            if (isProofValid === false) {
                console.log(`proof index ${proofIndex} is invalid`);
                return;
            }
        }
        const repNullifiers = decodedData.proofRelated.repNullifiers
            .map((n) => BigInt(n).toString())
            .filter((n) => n !== '0');
        const existingNullifier = await this._db.findOne('Nullifier', {
            where: {
                nullifier: repNullifiers,
                confirmed: true,
            },
        });
        if (existingNullifier) {
            console.log(`post duplicated nullifier`, repNullifiers);
            return;
        }
        // everything checks out, lets start mutating the db
        db.delete('Nullifier', {
            where: {
                nullifier: repNullifiers,
                confirmed: false,
            },
        });
        db.create('Nullifier', repNullifiers.map((nullifier) => ({
            epoch: _epoch,
            nullifier,
        })));
        if (findPost) {
            db.update('Post', {
                where: {
                    _id: findPost._id,
                },
                update: {
                    status: 1,
                    transactionHash: _transactionHash,
                    proofIndex,
                },
            });
        }
        else {
            let content = '';
            let title = '';
            if (decodedData !== null) {
                const postContent = (_a = decodedData._postContent) !== null && _a !== void 0 ? _a : decodedData.postContent;
                // TODO: remove underscores for new contract versions
                let i = postContent.indexOf(titlePrefix);
                if (i === -1) {
                    content = postContent;
                }
                else {
                    i = i + titlePrefix.length;
                    let j = postContent.indexOf(titlePostfix, i + 1);
                    if (j === -1) {
                        content = postContent;
                    }
                    else {
                        title = postContent.substring(i, j);
                        content = postContent.substring(j + titlePostfix.length);
                    }
                }
            }
            db.create('Post', {
                transactionHash: _transactionHash,
                title,
                content,
                epochKey: _epochKey,
                epoch: _epoch,
                proofIndex: proofIndex,
                proveMinRep: _minRep !== null ? true : false,
                minRep: _minRep,
                posRep: 0,
                negRep: 0,
                status: 1,
            });
        }
        db.delete('Record', {
            where: {
                transactionHash: _transactionHash,
                confirmed: false,
            },
        });
        db.create('Record', {
            to: _epochKey,
            from: _epochKey,
            upvote: 0,
            downvote: this.socialConfig.postRep,
            epoch: _epoch,
            action: ActionType.Post,
            data: _transactionHash,
            transactionHash: _transactionHash,
        });
        const existingEpkRecord = await this._db.findOne('EpkRecord', {
            where: {
                epk: _epochKey,
                epoch: _epoch,
            },
        });
        if (existingEpkRecord) {
            db.update('EpkRecord', {
                where: {
                    _id: existingEpkRecord._id,
                },
                update: {
                    spent: ((_b = existingEpkRecord === null || existingEpkRecord === void 0 ? void 0 : existingEpkRecord.spent) !== null && _b !== void 0 ? _b : 0) +
                        this.socialConfig.postRep,
                },
            });
        }
        else {
            db.create('EpkRecord', {
                epk: _epochKey,
                epoch: _epoch,
                spent: this.socialConfig.postRep,
                posRep: 0,
                negRep: 0,
            });
        }
    }
    async voteSubmittedEvent(event, db) {
        var _a, _b, _c, _d, _e;
        const voteId = event.transactionHash;
        const decodedData = this.unirepSocialContract.interface.decodeEventLog('VoteSubmitted', event.data);
        const _transactionHash = event.transactionHash;
        const _epoch = Number(event.topics[1]);
        const _fromEpochKey = BigInt(event.topics[2]).toString(16);
        const _toEpochKey = BigInt(event.topics[3]).toString(16);
        const _toEpochKeyProofIndex = Number(decodedData.toEpochKeyProofIndex._hex);
        const _posRep = Number(decodedData.upvoteValue._hex);
        const _negRep = Number(decodedData.downvoteValue._hex);
        const reputationProof = decodedData.proofRelated;
        const proofNullifier = await this.unirepContract.hashReputationProof(reputationProof);
        const fromProofIndex = Number(await this.unirepContract.getProofIndex(proofNullifier));
        const proof = await this._db.findOne('Proof', {
            where: {
                index: _toEpochKeyProofIndex,
                epoch: _epoch,
            },
        });
        if (!proof) {
            throw new Error('Unable to find proof for vote');
        }
        if (proof.valid === false) {
            console.log(`proof index ${_toEpochKeyProofIndex} is invalid`);
            return;
        }
        {
            const { isProofValid } = await this.verifyAttestationProof(_toEpochKeyProofIndex, _epoch, db);
            if (isProofValid === false) {
                console.log(`proof index ${_toEpochKeyProofIndex} is invalid`);
                return;
            }
        }
        const fromValidProof = await this._db.findOne('Proof', {
            where: {
                epoch: _epoch,
                index: fromProofIndex,
            },
        });
        if (!fromValidProof) {
            throw new Error('Unable to find from valid proof vote');
        }
        if (fromValidProof.valid === false) {
            console.log(`proof index ${fromProofIndex} is invalid`);
            return;
        }
        {
            const { isProofValid } = await this.verifyAttestationProof(fromProofIndex, _epoch, db);
            if (isProofValid === false) {
                console.log(`proof index ${fromProofIndex} is invalid`);
                return;
            }
        }
        const repNullifiers = decodedData.proofRelated.repNullifiers
            .map((n) => BigInt(n).toString())
            .filter((n) => n !== '0');
        const existingNullifier = await this._db.findOne('Nullifier', {
            where: {
                nullifier: repNullifiers,
                confirmed: true,
            },
        });
        if (existingNullifier) {
            console.log(`vote duplicated nullifier`, repNullifiers);
            return;
        }
        // everything checks out, lets start mutating the db
        db.delete('Nullifier', {
            where: {
                nullifier: repNullifiers,
                confirmed: false,
            },
        });
        db.create('Nullifier', repNullifiers.map((nullifier) => ({
            epoch: _epoch,
            nullifier,
        })));
        const findVote = await this._db.findOne('Vote', {
            where: { transactionHash: voteId },
        });
        if (findVote) {
            db.update('Vote', {
                where: {
                    _id: findVote._id,
                },
                update: {
                    status: 1,
                    transactionHash: _transactionHash,
                },
            });
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
        }
        else {
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
            });
        }
        db.delete('Record', {
            where: {
                transactionHash: _transactionHash,
                confirmed: false,
            },
        });
        db.create('Record', {
            to: _toEpochKey,
            from: _fromEpochKey,
            upvote: _posRep,
            downvote: _negRep,
            epoch: _epoch,
            action: ActionType.Vote,
            transactionHash: _transactionHash,
            data: '',
        });
        {
            const epkRecord = await this._db.findOne('EpkRecord', {
                where: {
                    epk: _fromEpochKey,
                    epoch: _epoch,
                },
            });
            if (epkRecord) {
                db.update('EpkRecord', {
                    where: {
                        _id: epkRecord._id,
                    },
                    update: {
                        spent: ((_a = epkRecord === null || epkRecord === void 0 ? void 0 : epkRecord.spent) !== null && _a !== void 0 ? _a : 0) + _posRep + _negRep,
                    },
                });
            }
            else {
                db.create('EpkRecord', {
                    epk: _fromEpochKey,
                    epoch: _epoch,
                    spent: _posRep + _negRep,
                    posRep: 0,
                    negRep: 0,
                });
            }
        }
        {
            const epkRecord = await this._db.findOne('EpkRecord', {
                where: {
                    epk: _toEpochKey,
                    epoch: _epoch,
                },
            });
            if (epkRecord) {
                db.update('EpkRecord', {
                    where: {
                        _id: epkRecord._id,
                    },
                    update: {
                        posRep: ((_b = epkRecord === null || epkRecord === void 0 ? void 0 : epkRecord.posRep) !== null && _b !== void 0 ? _b : 0) + _posRep,
                        negRep: ((_c = epkRecord === null || epkRecord === void 0 ? void 0 : epkRecord.negRep) !== null && _c !== void 0 ? _c : 0) + _negRep,
                    },
                });
            }
            else {
                db.create('EpkRecord', {
                    epk: _toEpochKey,
                    epoch: _epoch,
                    spent: 0,
                    posRep: ((_d = epkRecord === null || epkRecord === void 0 ? void 0 : epkRecord.posRep) !== null && _d !== void 0 ? _d : 0) + _posRep,
                    negRep: ((_e = epkRecord === null || epkRecord === void 0 ? void 0 : epkRecord.negRep) !== null && _e !== void 0 ? _e : 0) + _negRep,
                });
            }
        }
    }
    async airdropSubmittedEvent(event, db) {
        const decodedData = this.unirepSocialContract.interface.decodeEventLog('AirdropSubmitted', event.data);
        const _transactionHash = event.transactionHash;
        const _epoch = Number(event.topics[1]);
        const _epochKey = BigInt(event.topics[2]).toString(16);
        const signUpProof = decodedData.proofRelated;
        const proofNullifier = await this.unirepContract.hashSignUpProof(signUpProof);
        const proofIndex = Number(await this.unirepContract.getProofIndex(proofNullifier));
        const proof = await this._db.findOne('Proof', {
            where: {
                epoch: _epoch,
                index: proofIndex,
            },
        });
        if (!proof)
            throw new Error('Unable to find airdrop proof');
        const { isProofValid } = await this.verifyAttestationProof(proofIndex, _epoch, db);
        if (isProofValid === false)
            return console.log(`proof ${proofIndex} is invalid`);
        db.delete('Record', {
            where: {
                transactionHash: _transactionHash,
                confirmed: false,
            },
        });
        db.create('Record', {
            to: _epochKey,
            from: 'UnirepSocial',
            upvote: this.socialConfig.airdropRep,
            downvote: 0,
            epoch: _epoch,
            action: 'UST',
            data: '0',
            transactionHash: event.transactionHash,
        });
    }
}
exports.UnirepSocialSynchronizer = UnirepSocialSynchronizer;
