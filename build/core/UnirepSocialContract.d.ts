import { ethers } from 'ethers';
/**
 * An API module of Unirep Social contracts.
 * All contract-interacting domain logic should be defined in here.
 */
export declare class UnirepSocialContract {
    private url;
    private provider;
    private signer?;
    private contract;
    unirep?: ethers.Contract;
    constructor(unirepSocialAddress?: any, providerUrl?: any);
    unlock: (eth_privkey?: string | undefined) => Promise<string>;
    getUnirep: () => Promise<any>;
    currentEpoch: () => Promise<any>;
    attesterId: () => Promise<any>;
    attestingFee: () => Promise<any>;
    userSignUp: (commitment: string) => Promise<any>;
    private parseRepuationProof;
    publishPost: (postId: string, publicSignals: any, proof: any, postContent: string) => Promise<any>;
    leaveComment: (publicSignals: any, proof: any, postId: string, commentId: string, commentContent: string) => Promise<any>;
    vote: (publicSignals: any, proof: any, toEpochKey: BigInt | string, epochKeyProofIndex: BigInt | number, upvoteValue: number, downvoteValue: number) => Promise<any>;
    getReputationProofIndex: (publicSignals: any, proof: any) => Promise<any>;
    fastForward: () => Promise<void>;
    epochTransition: () => Promise<any>;
    private submitStartTransitionProof;
    getStartTransitionProofIndex: (startTransitionProof: any) => Promise<any>;
    private submitProcessAttestationsProof;
    getProcessAttestationsProofIndex: (processAttestaitonProof: any) => Promise<any>;
    private submitUserStateTransitionProof;
    userStateTransition: (results: any) => Promise<any>;
    airdrop: (publicSignals: any, proof: any) => Promise<any>;
    getPostEvents: (epoch?: number | undefined) => Promise<any>;
    verifyEpochKeyValidity: (publicSignals: any, proof: any) => Promise<boolean>;
    verifyReputation: (publicSignals: any, proof: any) => Promise<boolean>;
    verifyUserSignUp: (publicSignals: any, proof: any) => Promise<boolean>;
}
