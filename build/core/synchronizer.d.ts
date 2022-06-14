import { DB, TransactionDB } from 'anondb';
import { ethers } from 'ethers';
import { Synchronizer, Prover } from '@unirep/core';
export declare enum ActionType {
    Post = "Post",
    Comment = "Comment",
    Vote = "Vote",
    UST = "UST",
    Signup = "Signup"
}
export interface UnirepSocialConfig {
    postRep: number;
    commentRep: number;
    airdropRep: number;
}
export declare class UnirepSocialSynchronizer extends Synchronizer {
    socialConfig: UnirepSocialConfig;
    unirepSocialContract: ethers.Contract;
    constructor(db: DB, prover: Prover, unirepContract: ethers.Contract, unirepSocialContract: ethers.Contract, config?: UnirepSocialConfig);
    loadNewEvents(fromBlock: any, toBlock: any): Promise<any>;
    get topicHandlers(): any;
    get unirepSocialFilter(): {
        address: string;
        topics: string[][];
    };
    socialUserSignedUp(event: any, db: any): Promise<void>;
    private verifyAttestationProof;
    commentSubmittedEvent(event: ethers.Event, db: TransactionDB): Promise<void>;
    postSubmittedEvent(event: ethers.Event, db: TransactionDB): Promise<void>;
    voteSubmittedEvent(event: ethers.Event, db: TransactionDB): Promise<void>;
    airdropSubmittedEvent(event: ethers.Event, db: TransactionDB): Promise<void>;
}
