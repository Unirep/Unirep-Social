import { ethers } from 'ethers';
import { EpochKeyProof, ReputationProof, SignUpProof, UserTransitionProof } from '@unirep/contracts';
/**
 * An API module of Unirep Social contracts.
 * All contract-interacting domain logic should be defined in here.
 */
export declare class UnirepSocialContract {
    private provider;
    private signer?;
    private contract;
    unirep?: ethers.Contract;
    constructor(unirepSocialAddress: any, provider: any);
    unlock: (eth_privkey: string) => Promise<string>;
    getUnirep: () => Promise<any>;
    currentEpoch: () => Promise<any>;
    attesterId: () => Promise<any>;
    attestingFee: () => Promise<any>;
    userSignUp: (commitment: string) => Promise<any>;
    publishPost: (reputationProof: ReputationProof, postContent: string) => Promise<any>;
    leaveComment: (reputationProof: ReputationProof, postId: string, commentContent: string) => Promise<any>;
    vote: (reputationProof: ReputationProof, toEpochKey: BigInt | string, epochKeyProofIndex: BigInt | number, upvoteValue: number, downvoteValue: number) => Promise<any>;
    getReputationProofIndex: (reputationProof: ReputationProof) => Promise<any>;
    epochTransition: () => Promise<any>;
    submitStartTransitionProof: (startTransitionProof: any) => Promise<any>;
    getStartTransitionProofIndex: (startTransitionProof: any) => Promise<any>;
    submitProcessAttestationsProof: (processAttestaitonProof: any) => Promise<any>;
    getProcessAttestationsProofIndex: (processAttestaitonProof: any) => Promise<any>;
    submitUserStateTransitionProof: (USTProof: UserTransitionProof, proofIndexes: BigInt[], nonce?: number | undefined) => Promise<any>;
    userStateTransition: (results: any) => Promise<any>;
    airdrop: (signUpProof: SignUpProof) => Promise<any>;
    getPostEvents: (epoch?: number | undefined) => Promise<any>;
    verifyEpochKeyValidity: (epochKeyProof: EpochKeyProof) => Promise<boolean>;
    verifyReputation: (reputationProof: ReputationProof) => Promise<boolean>;
    verifyUserSignUp: (signUpProof: SignUpProof) => Promise<boolean>;
}
