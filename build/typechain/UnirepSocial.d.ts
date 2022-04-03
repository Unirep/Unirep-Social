import { BaseContract, BigNumber, BigNumberish, BytesLike, CallOverrides, ContractTransaction, Overrides, PayableOverrides, PopulatedTransaction, Signer, utils } from "ethers";
import { FunctionFragment, Result, EventFragment } from "@ethersproject/abi";
import { Listener, Provider } from "@ethersproject/providers";
import { TypedEventFilter, TypedEvent, TypedListener, OnEvent } from "./common";
export declare namespace UnirepTypes {
    type SignUpProofStruct = {
        epoch: BigNumberish;
        epochKey: BigNumberish;
        globalStateTree: BigNumberish;
        attesterId: BigNumberish;
        userHasSignedUp: BigNumberish;
        proof: BigNumberish[];
    };
    type SignUpProofStructOutput = [
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber[]
    ] & {
        epoch: BigNumber;
        epochKey: BigNumber;
        globalStateTree: BigNumber;
        attesterId: BigNumber;
        userHasSignedUp: BigNumber;
        proof: BigNumber[];
    };
    type ReputationProofStruct = {
        repNullifiers: BigNumberish[];
        epoch: BigNumberish;
        epochKey: BigNumberish;
        globalStateTree: BigNumberish;
        attesterId: BigNumberish;
        proveReputationAmount: BigNumberish;
        minRep: BigNumberish;
        proveGraffiti: BigNumberish;
        graffitiPreImage: BigNumberish;
        proof: BigNumberish[];
    };
    type ReputationProofStructOutput = [
        BigNumber[],
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber[]
    ] & {
        repNullifiers: BigNumber[];
        epoch: BigNumber;
        epochKey: BigNumber;
        globalStateTree: BigNumber;
        attesterId: BigNumber;
        proveReputationAmount: BigNumber;
        minRep: BigNumber;
        proveGraffiti: BigNumber;
        graffitiPreImage: BigNumber;
        proof: BigNumber[];
    };
    type UserTransitionProofStruct = {
        newGlobalStateTreeLeaf: BigNumberish;
        epkNullifiers: BigNumberish[];
        transitionFromEpoch: BigNumberish;
        blindedUserStates: BigNumberish[];
        fromGlobalStateTree: BigNumberish;
        blindedHashChains: BigNumberish[];
        fromEpochTree: BigNumberish;
        proof: BigNumberish[];
    };
    type UserTransitionProofStructOutput = [
        BigNumber,
        BigNumber[],
        BigNumber,
        BigNumber[],
        BigNumber,
        BigNumber[],
        BigNumber,
        BigNumber[]
    ] & {
        newGlobalStateTreeLeaf: BigNumber;
        epkNullifiers: BigNumber[];
        transitionFromEpoch: BigNumber;
        blindedUserStates: BigNumber[];
        fromGlobalStateTree: BigNumber;
        blindedHashChains: BigNumber[];
        fromEpochTree: BigNumber;
        proof: BigNumber[];
    };
}
export interface UnirepSocialInterface extends utils.Interface {
    contractName: "UnirepSocial";
    functions: {
        "airdrop((uint256,uint256,uint256,uint256,uint256,uint256[8]))": FunctionFragment;
        "airdroppedReputation()": FunctionFragment;
        "attesterId()": FunctionFragment;
        "commentReputation()": FunctionFragment;
        "isEpochKeyGotAirdrop(uint256)": FunctionFragment;
        "leaveComment(uint256,string,(uint256[],uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256[8]))": FunctionFragment;
        "postReputation()": FunctionFragment;
        "processAttestations(uint256,uint256,uint256,uint256[8])": FunctionFragment;
        "publishPost(string,(uint256[],uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256[8]))": FunctionFragment;
        "startUserStateTransition(uint256,uint256,uint256,uint256[8])": FunctionFragment;
        "unirep()": FunctionFragment;
        "updateUserStateRoot((uint256,uint256[],uint256,uint256[],uint256,uint256[],uint256,uint256[8]),uint256[])": FunctionFragment;
        "userSignUp(uint256)": FunctionFragment;
        "vote(uint256,uint256,uint256,uint256,(uint256[],uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256[8]))": FunctionFragment;
    };
    encodeFunctionData(functionFragment: "airdrop", values: [UnirepTypes.SignUpProofStruct]): string;
    encodeFunctionData(functionFragment: "airdroppedReputation", values?: undefined): string;
    encodeFunctionData(functionFragment: "attesterId", values?: undefined): string;
    encodeFunctionData(functionFragment: "commentReputation", values?: undefined): string;
    encodeFunctionData(functionFragment: "isEpochKeyGotAirdrop", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "leaveComment", values: [BigNumberish, string, UnirepTypes.ReputationProofStruct]): string;
    encodeFunctionData(functionFragment: "postReputation", values?: undefined): string;
    encodeFunctionData(functionFragment: "processAttestations", values: [BigNumberish, BigNumberish, BigNumberish, BigNumberish[]]): string;
    encodeFunctionData(functionFragment: "publishPost", values: [string, UnirepTypes.ReputationProofStruct]): string;
    encodeFunctionData(functionFragment: "startUserStateTransition", values: [BigNumberish, BigNumberish, BigNumberish, BigNumberish[]]): string;
    encodeFunctionData(functionFragment: "unirep", values?: undefined): string;
    encodeFunctionData(functionFragment: "updateUserStateRoot", values: [UnirepTypes.UserTransitionProofStruct, BigNumberish[]]): string;
    encodeFunctionData(functionFragment: "userSignUp", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "vote", values: [
        BigNumberish,
        BigNumberish,
        BigNumberish,
        BigNumberish,
        UnirepTypes.ReputationProofStruct
    ]): string;
    decodeFunctionResult(functionFragment: "airdrop", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "airdroppedReputation", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "attesterId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "commentReputation", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "isEpochKeyGotAirdrop", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "leaveComment", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "postReputation", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "processAttestations", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "publishPost", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "startUserStateTransition", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "unirep", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "updateUserStateRoot", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "userSignUp", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "vote", data: BytesLike): Result;
    events: {
        "AirdropSubmitted(uint256,uint256,tuple)": EventFragment;
        "CommentSubmitted(uint256,uint256,uint256,string,tuple)": EventFragment;
        "PostSubmitted(uint256,uint256,string,tuple)": EventFragment;
        "UserSignedUp(uint256,uint256)": EventFragment;
        "VoteSubmitted(uint256,uint256,uint256,uint256,uint256,uint256,tuple)": EventFragment;
    };
    getEvent(nameOrSignatureOrTopic: "AirdropSubmitted"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "CommentSubmitted"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "PostSubmitted"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "UserSignedUp"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "VoteSubmitted"): EventFragment;
}
export declare type AirdropSubmittedEvent = TypedEvent<[
    BigNumber,
    BigNumber,
    UnirepTypes.SignUpProofStructOutput
], {
    epoch: BigNumber;
    epochKey: BigNumber;
    proofRelated: UnirepTypes.SignUpProofStructOutput;
}>;
export declare type AirdropSubmittedEventFilter = TypedEventFilter<AirdropSubmittedEvent>;
export declare type CommentSubmittedEvent = TypedEvent<[
    BigNumber,
    BigNumber,
    BigNumber,
    string,
    UnirepTypes.ReputationProofStructOutput
], {
    epoch: BigNumber;
    postId: BigNumber;
    epochKey: BigNumber;
    commentContent: string;
    proofRelated: UnirepTypes.ReputationProofStructOutput;
}>;
export declare type CommentSubmittedEventFilter = TypedEventFilter<CommentSubmittedEvent>;
export declare type PostSubmittedEvent = TypedEvent<[
    BigNumber,
    BigNumber,
    string,
    UnirepTypes.ReputationProofStructOutput
], {
    epoch: BigNumber;
    epochKey: BigNumber;
    postContent: string;
    proofRelated: UnirepTypes.ReputationProofStructOutput;
}>;
export declare type PostSubmittedEventFilter = TypedEventFilter<PostSubmittedEvent>;
export declare type UserSignedUpEvent = TypedEvent<[
    BigNumber,
    BigNumber
], {
    epoch: BigNumber;
    identityCommitment: BigNumber;
}>;
export declare type UserSignedUpEventFilter = TypedEventFilter<UserSignedUpEvent>;
export declare type VoteSubmittedEvent = TypedEvent<[
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber,
    UnirepTypes.ReputationProofStructOutput
], {
    epoch: BigNumber;
    fromEpochKey: BigNumber;
    toEpochKey: BigNumber;
    upvoteValue: BigNumber;
    downvoteValue: BigNumber;
    toEpochKeyProofIndex: BigNumber;
    proofRelated: UnirepTypes.ReputationProofStructOutput;
}>;
export declare type VoteSubmittedEventFilter = TypedEventFilter<VoteSubmittedEvent>;
export interface UnirepSocial extends BaseContract {
    contractName: "UnirepSocial";
    connect(signerOrProvider: Signer | Provider | string): this;
    attach(addressOrName: string): this;
    deployed(): Promise<this>;
    interface: UnirepSocialInterface;
    queryFilter<TEvent extends TypedEvent>(event: TypedEventFilter<TEvent>, fromBlockOrBlockhash?: string | number | undefined, toBlock?: string | number | undefined): Promise<Array<TEvent>>;
    listeners<TEvent extends TypedEvent>(eventFilter?: TypedEventFilter<TEvent>): Array<TypedListener<TEvent>>;
    listeners(eventName?: string): Array<Listener>;
    removeAllListeners<TEvent extends TypedEvent>(eventFilter: TypedEventFilter<TEvent>): this;
    removeAllListeners(eventName?: string): this;
    off: OnEvent<this>;
    on: OnEvent<this>;
    once: OnEvent<this>;
    removeListener: OnEvent<this>;
    functions: {
        airdrop(signUpProofData: UnirepTypes.SignUpProofStruct, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        airdroppedReputation(overrides?: CallOverrides): Promise<[BigNumber]>;
        attesterId(overrides?: CallOverrides): Promise<[BigNumber]>;
        commentReputation(overrides?: CallOverrides): Promise<[BigNumber]>;
        isEpochKeyGotAirdrop(arg0: BigNumberish, overrides?: CallOverrides): Promise<[boolean]>;
        leaveComment(postId: BigNumberish, content: string, proofRelated: UnirepTypes.ReputationProofStruct, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        postReputation(overrides?: CallOverrides): Promise<[BigNumber]>;
        processAttestations(outputBlindedUserState: BigNumberish, outputBlindedHashChain: BigNumberish, inputBlindedUserState: BigNumberish, proof: BigNumberish[], overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        publishPost(content: string, proofRelated: UnirepTypes.ReputationProofStruct, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        startUserStateTransition(blindedUserState: BigNumberish, blindedHashChain: BigNumberish, GSTRoot: BigNumberish, proof: BigNumberish[], overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        unirep(overrides?: CallOverrides): Promise<[string]>;
        updateUserStateRoot(userTransitionedData: UnirepTypes.UserTransitionProofStruct, proofIndexes: BigNumberish[], overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        userSignUp(identityCommitment: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        vote(upvoteValue: BigNumberish, downvoteValue: BigNumberish, toEpochKey: BigNumberish, toEpochKeyProofIndex: BigNumberish, proofRelated: UnirepTypes.ReputationProofStruct, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
    };
    airdrop(signUpProofData: UnirepTypes.SignUpProofStruct, overrides?: PayableOverrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    airdroppedReputation(overrides?: CallOverrides): Promise<BigNumber>;
    attesterId(overrides?: CallOverrides): Promise<BigNumber>;
    commentReputation(overrides?: CallOverrides): Promise<BigNumber>;
    isEpochKeyGotAirdrop(arg0: BigNumberish, overrides?: CallOverrides): Promise<boolean>;
    leaveComment(postId: BigNumberish, content: string, proofRelated: UnirepTypes.ReputationProofStruct, overrides?: PayableOverrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    postReputation(overrides?: CallOverrides): Promise<BigNumber>;
    processAttestations(outputBlindedUserState: BigNumberish, outputBlindedHashChain: BigNumberish, inputBlindedUserState: BigNumberish, proof: BigNumberish[], overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    publishPost(content: string, proofRelated: UnirepTypes.ReputationProofStruct, overrides?: PayableOverrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    startUserStateTransition(blindedUserState: BigNumberish, blindedHashChain: BigNumberish, GSTRoot: BigNumberish, proof: BigNumberish[], overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    unirep(overrides?: CallOverrides): Promise<string>;
    updateUserStateRoot(userTransitionedData: UnirepTypes.UserTransitionProofStruct, proofIndexes: BigNumberish[], overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    userSignUp(identityCommitment: BigNumberish, overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    vote(upvoteValue: BigNumberish, downvoteValue: BigNumberish, toEpochKey: BigNumberish, toEpochKeyProofIndex: BigNumberish, proofRelated: UnirepTypes.ReputationProofStruct, overrides?: PayableOverrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    callStatic: {
        airdrop(signUpProofData: UnirepTypes.SignUpProofStruct, overrides?: CallOverrides): Promise<void>;
        airdroppedReputation(overrides?: CallOverrides): Promise<BigNumber>;
        attesterId(overrides?: CallOverrides): Promise<BigNumber>;
        commentReputation(overrides?: CallOverrides): Promise<BigNumber>;
        isEpochKeyGotAirdrop(arg0: BigNumberish, overrides?: CallOverrides): Promise<boolean>;
        leaveComment(postId: BigNumberish, content: string, proofRelated: UnirepTypes.ReputationProofStruct, overrides?: CallOverrides): Promise<void>;
        postReputation(overrides?: CallOverrides): Promise<BigNumber>;
        processAttestations(outputBlindedUserState: BigNumberish, outputBlindedHashChain: BigNumberish, inputBlindedUserState: BigNumberish, proof: BigNumberish[], overrides?: CallOverrides): Promise<void>;
        publishPost(content: string, proofRelated: UnirepTypes.ReputationProofStruct, overrides?: CallOverrides): Promise<void>;
        startUserStateTransition(blindedUserState: BigNumberish, blindedHashChain: BigNumberish, GSTRoot: BigNumberish, proof: BigNumberish[], overrides?: CallOverrides): Promise<void>;
        unirep(overrides?: CallOverrides): Promise<string>;
        updateUserStateRoot(userTransitionedData: UnirepTypes.UserTransitionProofStruct, proofIndexes: BigNumberish[], overrides?: CallOverrides): Promise<void>;
        userSignUp(identityCommitment: BigNumberish, overrides?: CallOverrides): Promise<void>;
        vote(upvoteValue: BigNumberish, downvoteValue: BigNumberish, toEpochKey: BigNumberish, toEpochKeyProofIndex: BigNumberish, proofRelated: UnirepTypes.ReputationProofStruct, overrides?: CallOverrides): Promise<void>;
    };
    filters: {
        "AirdropSubmitted(uint256,uint256,tuple)"(epoch?: BigNumberish | null, epochKey?: BigNumberish | null, proofRelated?: null): AirdropSubmittedEventFilter;
        AirdropSubmitted(epoch?: BigNumberish | null, epochKey?: BigNumberish | null, proofRelated?: null): AirdropSubmittedEventFilter;
        "CommentSubmitted(uint256,uint256,uint256,string,tuple)"(epoch?: BigNumberish | null, postId?: BigNumberish | null, epochKey?: BigNumberish | null, commentContent?: null, proofRelated?: null): CommentSubmittedEventFilter;
        CommentSubmitted(epoch?: BigNumberish | null, postId?: BigNumberish | null, epochKey?: BigNumberish | null, commentContent?: null, proofRelated?: null): CommentSubmittedEventFilter;
        "PostSubmitted(uint256,uint256,string,tuple)"(epoch?: BigNumberish | null, epochKey?: BigNumberish | null, postContent?: null, proofRelated?: null): PostSubmittedEventFilter;
        PostSubmitted(epoch?: BigNumberish | null, epochKey?: BigNumberish | null, postContent?: null, proofRelated?: null): PostSubmittedEventFilter;
        "UserSignedUp(uint256,uint256)"(epoch?: BigNumberish | null, identityCommitment?: BigNumberish | null): UserSignedUpEventFilter;
        UserSignedUp(epoch?: BigNumberish | null, identityCommitment?: BigNumberish | null): UserSignedUpEventFilter;
        "VoteSubmitted(uint256,uint256,uint256,uint256,uint256,uint256,tuple)"(epoch?: BigNumberish | null, fromEpochKey?: BigNumberish | null, toEpochKey?: BigNumberish | null, upvoteValue?: null, downvoteValue?: null, toEpochKeyProofIndex?: null, proofRelated?: null): VoteSubmittedEventFilter;
        VoteSubmitted(epoch?: BigNumberish | null, fromEpochKey?: BigNumberish | null, toEpochKey?: BigNumberish | null, upvoteValue?: null, downvoteValue?: null, toEpochKeyProofIndex?: null, proofRelated?: null): VoteSubmittedEventFilter;
    };
    estimateGas: {
        airdrop(signUpProofData: UnirepTypes.SignUpProofStruct, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        airdroppedReputation(overrides?: CallOverrides): Promise<BigNumber>;
        attesterId(overrides?: CallOverrides): Promise<BigNumber>;
        commentReputation(overrides?: CallOverrides): Promise<BigNumber>;
        isEpochKeyGotAirdrop(arg0: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
        leaveComment(postId: BigNumberish, content: string, proofRelated: UnirepTypes.ReputationProofStruct, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        postReputation(overrides?: CallOverrides): Promise<BigNumber>;
        processAttestations(outputBlindedUserState: BigNumberish, outputBlindedHashChain: BigNumberish, inputBlindedUserState: BigNumberish, proof: BigNumberish[], overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        publishPost(content: string, proofRelated: UnirepTypes.ReputationProofStruct, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        startUserStateTransition(blindedUserState: BigNumberish, blindedHashChain: BigNumberish, GSTRoot: BigNumberish, proof: BigNumberish[], overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        unirep(overrides?: CallOverrides): Promise<BigNumber>;
        updateUserStateRoot(userTransitionedData: UnirepTypes.UserTransitionProofStruct, proofIndexes: BigNumberish[], overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        userSignUp(identityCommitment: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        vote(upvoteValue: BigNumberish, downvoteValue: BigNumberish, toEpochKey: BigNumberish, toEpochKeyProofIndex: BigNumberish, proofRelated: UnirepTypes.ReputationProofStruct, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
    };
    populateTransaction: {
        airdrop(signUpProofData: UnirepTypes.SignUpProofStruct, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        airdroppedReputation(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        attesterId(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        commentReputation(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        isEpochKeyGotAirdrop(arg0: BigNumberish, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        leaveComment(postId: BigNumberish, content: string, proofRelated: UnirepTypes.ReputationProofStruct, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        postReputation(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        processAttestations(outputBlindedUserState: BigNumberish, outputBlindedHashChain: BigNumberish, inputBlindedUserState: BigNumberish, proof: BigNumberish[], overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        publishPost(content: string, proofRelated: UnirepTypes.ReputationProofStruct, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        startUserStateTransition(blindedUserState: BigNumberish, blindedHashChain: BigNumberish, GSTRoot: BigNumberish, proof: BigNumberish[], overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        unirep(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        updateUserStateRoot(userTransitionedData: UnirepTypes.UserTransitionProofStruct, proofIndexes: BigNumberish[], overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        userSignUp(identityCommitment: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        vote(upvoteValue: BigNumberish, downvoteValue: BigNumberish, toEpochKey: BigNumberish, toEpochKeyProofIndex: BigNumberish, proofRelated: UnirepTypes.ReputationProofStruct, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
    };
}
