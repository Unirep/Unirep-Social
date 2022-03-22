import { BaseContract, BigNumber, BigNumberish, BytesLike, CallOverrides, ContractTransaction, Overrides, PayableOverrides, PopulatedTransaction, Signer, utils } from "ethers";
import { FunctionFragment, Result, EventFragment } from "@ethersproject/abi";
import { Listener, Provider } from "@ethersproject/providers";
import { TypedEventFilter, TypedEvent, TypedListener, OnEvent } from "./common";
export declare namespace UnirepObjs {
    type TreeDepthsStruct = {
        globalStateTreeDepth: BigNumberish;
        userStateTreeDepth: BigNumberish;
        epochTreeDepth: BigNumberish;
    };
    type TreeDepthsStructOutput = [number, number, number] & {
        globalStateTreeDepth: number;
        userStateTreeDepth: number;
        epochTreeDepth: number;
    };
    type MaxValuesStruct = {
        maxUsers: BigNumberish;
        maxAttesters: BigNumberish;
    };
    type MaxValuesStructOutput = [BigNumber, BigNumber] & {
        maxUsers: BigNumber;
        maxAttesters: BigNumber;
    };
    type AttestationStruct = {
        attesterId: BigNumberish;
        posRep: BigNumberish;
        negRep: BigNumberish;
        graffiti: BigNumberish;
        signUp: BigNumberish;
    };
    type AttestationStructOutput = [
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber
    ] & {
        attesterId: BigNumber;
        posRep: BigNumber;
        negRep: BigNumber;
        graffiti: BigNumber;
        signUp: BigNumber;
    };
    type EpochKeyProofStruct = {
        globalStateTree: BigNumberish;
        epoch: BigNumberish;
        epochKey: BigNumberish;
        proof: BigNumberish[];
    };
    type EpochKeyProofStructOutput = [
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber[]
    ] & {
        globalStateTree: BigNumber;
        epoch: BigNumber;
        epochKey: BigNumber;
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
export interface UnirepInterface extends utils.Interface {
    contractName: "Unirep";
    functions: {
        "airdropAmount(address)": FunctionFragment;
        "airdropEpochKey((uint256,uint256,uint256,uint256,uint256,uint256[8]))": FunctionFragment;
        "attesterSignUp()": FunctionFragment;
        "attesterSignUpViaRelayer(address,bytes)": FunctionFragment;
        "attesters(address)": FunctionFragment;
        "attestingFee()": FunctionFragment;
        "beginEpochTransition()": FunctionFragment;
        "burnAttestingFee()": FunctionFragment;
        "collectEpochTransitionCompensation()": FunctionFragment;
        "collectedAttestingFee()": FunctionFragment;
        "currentEpoch()": FunctionFragment;
        "epochLength()": FunctionFragment;
        "epochTransitionCompensation(address)": FunctionFragment;
        "getProofIndex(bytes32)": FunctionFragment;
        "hasUserSignedUp(uint256)": FunctionFragment;
        "hashEpochKeyProof((uint256,uint256,uint256,uint256[8]))": FunctionFragment;
        "hashProcessAttestationsProof(uint256,uint256,uint256,uint256[8])": FunctionFragment;
        "hashReputationProof((uint256[],uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256[8]))": FunctionFragment;
        "hashSignUpProof((uint256,uint256,uint256,uint256,uint256,uint256[8]))": FunctionFragment;
        "hashStartTransitionProof(uint256,uint256,uint256,uint256[8])": FunctionFragment;
        "hashUserStateTransitionProof((uint256,uint256[],uint256,uint256[],uint256,uint256[],uint256,uint256[8]))": FunctionFragment;
        "latestEpochTransitionTime()": FunctionFragment;
        "maxAttesters()": FunctionFragment;
        "maxEpochKey()": FunctionFragment;
        "maxReputationBudget()": FunctionFragment;
        "maxUsers()": FunctionFragment;
        "nextAttesterId()": FunctionFragment;
        "numEpochKeyNoncePerEpoch()": FunctionFragment;
        "numUserSignUps()": FunctionFragment;
        "processAttestations(uint256,uint256,uint256,uint256[8])": FunctionFragment;
        "setAirdropAmount(uint256)": FunctionFragment;
        "spendReputation((uint256[],uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256[8]))": FunctionFragment;
        "startUserStateTransition(uint256,uint256,uint256,uint256[8])": FunctionFragment;
        "submitAttestation((uint256,uint256,uint256,uint256,uint256),uint256,uint256,uint256)": FunctionFragment;
        "submitAttestationViaRelayer(address,bytes,(uint256,uint256,uint256,uint256,uint256),uint256,uint256,uint256)": FunctionFragment;
        "submitEpochKeyProof((uint256,uint256,uint256,uint256[8]))": FunctionFragment;
        "treeDepths()": FunctionFragment;
        "unpackProof(uint256[8])": FunctionFragment;
        "updateUserStateRoot((uint256,uint256[],uint256,uint256[],uint256,uint256[],uint256,uint256[8]),uint256[])": FunctionFragment;
        "userSignUp(uint256)": FunctionFragment;
        "verifyEpochKeyValidity((uint256,uint256,uint256,uint256[8]))": FunctionFragment;
        "verifyProcessAttestationProof(uint256,uint256,uint256,uint256[8])": FunctionFragment;
        "verifyReputation((uint256[],uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256[8]))": FunctionFragment;
        "verifyStartTransitionProof(uint256,uint256,uint256,uint256[8])": FunctionFragment;
        "verifyUserSignUp((uint256,uint256,uint256,uint256,uint256,uint256[8]))": FunctionFragment;
        "verifyUserStateTransition((uint256,uint256[],uint256,uint256[],uint256,uint256[],uint256,uint256[8]))": FunctionFragment;
    };
    encodeFunctionData(functionFragment: "airdropAmount", values: [string]): string;
    encodeFunctionData(functionFragment: "airdropEpochKey", values: [UnirepObjs.SignUpProofStruct]): string;
    encodeFunctionData(functionFragment: "attesterSignUp", values?: undefined): string;
    encodeFunctionData(functionFragment: "attesterSignUpViaRelayer", values: [string, BytesLike]): string;
    encodeFunctionData(functionFragment: "attesters", values: [string]): string;
    encodeFunctionData(functionFragment: "attestingFee", values?: undefined): string;
    encodeFunctionData(functionFragment: "beginEpochTransition", values?: undefined): string;
    encodeFunctionData(functionFragment: "burnAttestingFee", values?: undefined): string;
    encodeFunctionData(functionFragment: "collectEpochTransitionCompensation", values?: undefined): string;
    encodeFunctionData(functionFragment: "collectedAttestingFee", values?: undefined): string;
    encodeFunctionData(functionFragment: "currentEpoch", values?: undefined): string;
    encodeFunctionData(functionFragment: "epochLength", values?: undefined): string;
    encodeFunctionData(functionFragment: "epochTransitionCompensation", values: [string]): string;
    encodeFunctionData(functionFragment: "getProofIndex", values: [BytesLike]): string;
    encodeFunctionData(functionFragment: "hasUserSignedUp", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "hashEpochKeyProof", values: [UnirepObjs.EpochKeyProofStruct]): string;
    encodeFunctionData(functionFragment: "hashProcessAttestationsProof", values: [BigNumberish, BigNumberish, BigNumberish, BigNumberish[]]): string;
    encodeFunctionData(functionFragment: "hashReputationProof", values: [UnirepObjs.ReputationProofStruct]): string;
    encodeFunctionData(functionFragment: "hashSignUpProof", values: [UnirepObjs.SignUpProofStruct]): string;
    encodeFunctionData(functionFragment: "hashStartTransitionProof", values: [BigNumberish, BigNumberish, BigNumberish, BigNumberish[]]): string;
    encodeFunctionData(functionFragment: "hashUserStateTransitionProof", values: [UnirepObjs.UserTransitionProofStruct]): string;
    encodeFunctionData(functionFragment: "latestEpochTransitionTime", values?: undefined): string;
    encodeFunctionData(functionFragment: "maxAttesters", values?: undefined): string;
    encodeFunctionData(functionFragment: "maxEpochKey", values?: undefined): string;
    encodeFunctionData(functionFragment: "maxReputationBudget", values?: undefined): string;
    encodeFunctionData(functionFragment: "maxUsers", values?: undefined): string;
    encodeFunctionData(functionFragment: "nextAttesterId", values?: undefined): string;
    encodeFunctionData(functionFragment: "numEpochKeyNoncePerEpoch", values?: undefined): string;
    encodeFunctionData(functionFragment: "numUserSignUps", values?: undefined): string;
    encodeFunctionData(functionFragment: "processAttestations", values: [BigNumberish, BigNumberish, BigNumberish, BigNumberish[]]): string;
    encodeFunctionData(functionFragment: "setAirdropAmount", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "spendReputation", values: [UnirepObjs.ReputationProofStruct]): string;
    encodeFunctionData(functionFragment: "startUserStateTransition", values: [BigNumberish, BigNumberish, BigNumberish, BigNumberish[]]): string;
    encodeFunctionData(functionFragment: "submitAttestation", values: [
        UnirepObjs.AttestationStruct,
        BigNumberish,
        BigNumberish,
        BigNumberish
    ]): string;
    encodeFunctionData(functionFragment: "submitAttestationViaRelayer", values: [
        string,
        BytesLike,
        UnirepObjs.AttestationStruct,
        BigNumberish,
        BigNumberish,
        BigNumberish
    ]): string;
    encodeFunctionData(functionFragment: "submitEpochKeyProof", values: [UnirepObjs.EpochKeyProofStruct]): string;
    encodeFunctionData(functionFragment: "treeDepths", values?: undefined): string;
    encodeFunctionData(functionFragment: "unpackProof", values: [BigNumberish[]]): string;
    encodeFunctionData(functionFragment: "updateUserStateRoot", values: [UnirepObjs.UserTransitionProofStruct, BigNumberish[]]): string;
    encodeFunctionData(functionFragment: "userSignUp", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "verifyEpochKeyValidity", values: [UnirepObjs.EpochKeyProofStruct]): string;
    encodeFunctionData(functionFragment: "verifyProcessAttestationProof", values: [BigNumberish, BigNumberish, BigNumberish, BigNumberish[]]): string;
    encodeFunctionData(functionFragment: "verifyReputation", values: [UnirepObjs.ReputationProofStruct]): string;
    encodeFunctionData(functionFragment: "verifyStartTransitionProof", values: [BigNumberish, BigNumberish, BigNumberish, BigNumberish[]]): string;
    encodeFunctionData(functionFragment: "verifyUserSignUp", values: [UnirepObjs.SignUpProofStruct]): string;
    encodeFunctionData(functionFragment: "verifyUserStateTransition", values: [UnirepObjs.UserTransitionProofStruct]): string;
    decodeFunctionResult(functionFragment: "airdropAmount", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "airdropEpochKey", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "attesterSignUp", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "attesterSignUpViaRelayer", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "attesters", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "attestingFee", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "beginEpochTransition", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "burnAttestingFee", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "collectEpochTransitionCompensation", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "collectedAttestingFee", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "currentEpoch", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "epochLength", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "epochTransitionCompensation", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getProofIndex", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "hasUserSignedUp", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "hashEpochKeyProof", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "hashProcessAttestationsProof", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "hashReputationProof", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "hashSignUpProof", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "hashStartTransitionProof", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "hashUserStateTransitionProof", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "latestEpochTransitionTime", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "maxAttesters", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "maxEpochKey", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "maxReputationBudget", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "maxUsers", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "nextAttesterId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "numEpochKeyNoncePerEpoch", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "numUserSignUps", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "processAttestations", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setAirdropAmount", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "spendReputation", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "startUserStateTransition", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "submitAttestation", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "submitAttestationViaRelayer", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "submitEpochKeyProof", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "treeDepths", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "unpackProof", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "updateUserStateRoot", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "userSignUp", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "verifyEpochKeyValidity", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "verifyProcessAttestationProof", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "verifyReputation", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "verifyStartTransitionProof", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "verifyUserSignUp", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "verifyUserStateTransition", data: BytesLike): Result;
    events: {
        "AttestationSubmitted(uint256,uint256,address,uint8,tuple,uint256,uint256,uint256)": EventFragment;
        "EpochEnded(uint256)": EventFragment;
        "IndexedEpochKeyProof(uint256,uint256,uint256,tuple)": EventFragment;
        "IndexedProcessedAttestationsProof(uint256,uint256,uint256,uint256,uint256[8])": EventFragment;
        "IndexedReputationProof(uint256,uint256,uint256,tuple)": EventFragment;
        "IndexedStartedTransitionProof(uint256,uint256,uint256,uint256,uint256[8])": EventFragment;
        "IndexedUserSignedUpProof(uint256,uint256,uint256,tuple)": EventFragment;
        "IndexedUserStateTransitionProof(uint256,tuple,uint256[])": EventFragment;
        "Sequencer(uint256,uint8)": EventFragment;
        "UserSignedUp(uint256,uint256,uint256,uint256)": EventFragment;
        "UserStateTransitioned(uint256,uint256,uint256)": EventFragment;
    };
    getEvent(nameOrSignatureOrTopic: "AttestationSubmitted"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "EpochEnded"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "IndexedEpochKeyProof"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "IndexedProcessedAttestationsProof"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "IndexedReputationProof"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "IndexedStartedTransitionProof"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "IndexedUserSignedUpProof"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "IndexedUserStateTransitionProof"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "Sequencer"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "UserSignedUp"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "UserStateTransitioned"): EventFragment;
}
export declare type AttestationSubmittedEvent = TypedEvent<[
    BigNumber,
    BigNumber,
    string,
    number,
    UnirepObjs.AttestationStructOutput,
    BigNumber,
    BigNumber,
    BigNumber
], {
    _epoch: BigNumber;
    _epochKey: BigNumber;
    _attester: string;
    _event: number;
    _attestation: UnirepObjs.AttestationStructOutput;
    toProofIndex: BigNumber;
    fromProofIndex: BigNumber;
    attestIndex: BigNumber;
}>;
export declare type AttestationSubmittedEventFilter = TypedEventFilter<AttestationSubmittedEvent>;
export declare type EpochEndedEvent = TypedEvent<[BigNumber], {
    _epoch: BigNumber;
}>;
export declare type EpochEndedEventFilter = TypedEventFilter<EpochEndedEvent>;
export declare type IndexedEpochKeyProofEvent = TypedEvent<[
    BigNumber,
    BigNumber,
    BigNumber,
    UnirepObjs.EpochKeyProofStructOutput
], {
    _proofIndex: BigNumber;
    _epoch: BigNumber;
    _epochKey: BigNumber;
    _proof: UnirepObjs.EpochKeyProofStructOutput;
}>;
export declare type IndexedEpochKeyProofEventFilter = TypedEventFilter<IndexedEpochKeyProofEvent>;
export declare type IndexedProcessedAttestationsProofEvent = TypedEvent<[
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber[]
], {
    _proofIndex: BigNumber;
    _inputBlindedUserState: BigNumber;
    _outputBlindedUserState: BigNumber;
    _outputBlindedHashChain: BigNumber;
    _proof: BigNumber[];
}>;
export declare type IndexedProcessedAttestationsProofEventFilter = TypedEventFilter<IndexedProcessedAttestationsProofEvent>;
export declare type IndexedReputationProofEvent = TypedEvent<[
    BigNumber,
    BigNumber,
    BigNumber,
    UnirepObjs.ReputationProofStructOutput
], {
    _proofIndex: BigNumber;
    _epoch: BigNumber;
    _epochKey: BigNumber;
    _proof: UnirepObjs.ReputationProofStructOutput;
}>;
export declare type IndexedReputationProofEventFilter = TypedEventFilter<IndexedReputationProofEvent>;
export declare type IndexedStartedTransitionProofEvent = TypedEvent<[
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber[]
], {
    _proofIndex: BigNumber;
    _blindedUserState: BigNumber;
    _globalStateTree: BigNumber;
    _blindedHashChain: BigNumber;
    _proof: BigNumber[];
}>;
export declare type IndexedStartedTransitionProofEventFilter = TypedEventFilter<IndexedStartedTransitionProofEvent>;
export declare type IndexedUserSignedUpProofEvent = TypedEvent<[
    BigNumber,
    BigNumber,
    BigNumber,
    UnirepObjs.SignUpProofStructOutput
], {
    _proofIndex: BigNumber;
    _epoch: BigNumber;
    _epochKey: BigNumber;
    _proof: UnirepObjs.SignUpProofStructOutput;
}>;
export declare type IndexedUserSignedUpProofEventFilter = TypedEventFilter<IndexedUserSignedUpProofEvent>;
export declare type IndexedUserStateTransitionProofEvent = TypedEvent<[
    BigNumber,
    UnirepObjs.UserTransitionProofStructOutput,
    BigNumber[]
], {
    _proofIndex: BigNumber;
    _proof: UnirepObjs.UserTransitionProofStructOutput;
    _proofIndexRecords: BigNumber[];
}>;
export declare type IndexedUserStateTransitionProofEventFilter = TypedEventFilter<IndexedUserStateTransitionProofEvent>;
export declare type SequencerEvent = TypedEvent<[
    BigNumber,
    number
], {
    _epoch: BigNumber;
    _event: number;
}>;
export declare type SequencerEventFilter = TypedEventFilter<SequencerEvent>;
export declare type UserSignedUpEvent = TypedEvent<[
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber
], {
    _epoch: BigNumber;
    _identityCommitment: BigNumber;
    _attesterId: BigNumber;
    _airdropAmount: BigNumber;
}>;
export declare type UserSignedUpEventFilter = TypedEventFilter<UserSignedUpEvent>;
export declare type UserStateTransitionedEvent = TypedEvent<[
    BigNumber,
    BigNumber,
    BigNumber
], {
    _epoch: BigNumber;
    _hashedLeaf: BigNumber;
    _proofIndex: BigNumber;
}>;
export declare type UserStateTransitionedEventFilter = TypedEventFilter<UserStateTransitionedEvent>;
export interface Unirep extends BaseContract {
    contractName: "Unirep";
    connect(signerOrProvider: Signer | Provider | string): this;
    attach(addressOrName: string): this;
    deployed(): Promise<this>;
    interface: UnirepInterface;
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
        airdropAmount(arg0: string, overrides?: CallOverrides): Promise<[BigNumber]>;
        airdropEpochKey(_input: UnirepObjs.SignUpProofStruct, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        attesterSignUp(overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        attesterSignUpViaRelayer(attester: string, signature: BytesLike, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        attesters(arg0: string, overrides?: CallOverrides): Promise<[BigNumber]>;
        attestingFee(overrides?: CallOverrides): Promise<[BigNumber]>;
        beginEpochTransition(overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        burnAttestingFee(overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        collectEpochTransitionCompensation(overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        collectedAttestingFee(overrides?: CallOverrides): Promise<[BigNumber]>;
        currentEpoch(overrides?: CallOverrides): Promise<[BigNumber]>;
        epochLength(overrides?: CallOverrides): Promise<[BigNumber]>;
        epochTransitionCompensation(arg0: string, overrides?: CallOverrides): Promise<[BigNumber]>;
        getProofIndex(arg0: BytesLike, overrides?: CallOverrides): Promise<[BigNumber]>;
        hasUserSignedUp(arg0: BigNumberish, overrides?: CallOverrides): Promise<[boolean]>;
        hashEpochKeyProof(_input: UnirepObjs.EpochKeyProofStruct, overrides?: CallOverrides): Promise<[string]>;
        hashProcessAttestationsProof(_outputBlindedUserState: BigNumberish, _outputBlindedHashChain: BigNumberish, _inputBlindedUserState: BigNumberish, _proof: BigNumberish[], overrides?: CallOverrides): Promise<[string]>;
        hashReputationProof(_input: UnirepObjs.ReputationProofStruct, overrides?: CallOverrides): Promise<[string]>;
        hashSignUpProof(_input: UnirepObjs.SignUpProofStruct, overrides?: CallOverrides): Promise<[string]>;
        hashStartTransitionProof(_blindedUserState: BigNumberish, _blindedHashChain: BigNumberish, _globalStateTree: BigNumberish, _proof: BigNumberish[], overrides?: CallOverrides): Promise<[string]>;
        hashUserStateTransitionProof(_input: UnirepObjs.UserTransitionProofStruct, overrides?: CallOverrides): Promise<[string]>;
        latestEpochTransitionTime(overrides?: CallOverrides): Promise<[BigNumber]>;
        maxAttesters(overrides?: CallOverrides): Promise<[BigNumber]>;
        maxEpochKey(overrides?: CallOverrides): Promise<[BigNumber]>;
        maxReputationBudget(overrides?: CallOverrides): Promise<[number]>;
        maxUsers(overrides?: CallOverrides): Promise<[BigNumber]>;
        nextAttesterId(overrides?: CallOverrides): Promise<[BigNumber]>;
        numEpochKeyNoncePerEpoch(overrides?: CallOverrides): Promise<[number]>;
        numUserSignUps(overrides?: CallOverrides): Promise<[BigNumber]>;
        processAttestations(_outputBlindedUserState: BigNumberish, _outputBlindedHashChain: BigNumberish, _inputBlindedUserState: BigNumberish, _proof: BigNumberish[], overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        setAirdropAmount(_airdropAmount: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        spendReputation(_input: UnirepObjs.ReputationProofStruct, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        startUserStateTransition(_blindedUserState: BigNumberish, _blindedHashChain: BigNumberish, _globalStateTree: BigNumberish, _proof: BigNumberish[], overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        submitAttestation(attestation: UnirepObjs.AttestationStruct, epochKey: BigNumberish, toProofIndex: BigNumberish, fromProofIndex: BigNumberish, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        submitAttestationViaRelayer(attester: string, signature: BytesLike, attestation: UnirepObjs.AttestationStruct, epochKey: BigNumberish, toProofIndex: BigNumberish, fromProofIndex: BigNumberish, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        submitEpochKeyProof(_input: UnirepObjs.EpochKeyProofStruct, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        treeDepths(overrides?: CallOverrides): Promise<[
            number,
            number,
            number
        ] & {
            globalStateTreeDepth: number;
            userStateTreeDepth: number;
            epochTreeDepth: number;
        }>;
        unpackProof(_proof: BigNumberish[], overrides?: CallOverrides): Promise<[
            [
                BigNumber,
                BigNumber
            ],
            [
                [BigNumber, BigNumber],
                [BigNumber, BigNumber]
            ],
            [
                BigNumber,
                BigNumber
            ]
        ]>;
        updateUserStateRoot(_proof: UnirepObjs.UserTransitionProofStruct, proofIndexRecords: BigNumberish[], overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        userSignUp(_identityCommitment: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        verifyEpochKeyValidity(_input: UnirepObjs.EpochKeyProofStruct, overrides?: CallOverrides): Promise<[boolean]>;
        verifyProcessAttestationProof(_outputBlindedUserState: BigNumberish, _outputBlindedHashChain: BigNumberish, _inputBlindedUserState: BigNumberish, _proof: BigNumberish[], overrides?: CallOverrides): Promise<[boolean]>;
        verifyReputation(_input: UnirepObjs.ReputationProofStruct, overrides?: CallOverrides): Promise<[boolean]>;
        verifyStartTransitionProof(_blindedUserState: BigNumberish, _blindedHashChain: BigNumberish, _GSTRoot: BigNumberish, _proof: BigNumberish[], overrides?: CallOverrides): Promise<[boolean]>;
        verifyUserSignUp(_input: UnirepObjs.SignUpProofStruct, overrides?: CallOverrides): Promise<[boolean]>;
        verifyUserStateTransition(_input: UnirepObjs.UserTransitionProofStruct, overrides?: CallOverrides): Promise<[boolean]>;
    };
    airdropAmount(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;
    airdropEpochKey(_input: UnirepObjs.SignUpProofStruct, overrides?: PayableOverrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    attesterSignUp(overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    attesterSignUpViaRelayer(attester: string, signature: BytesLike, overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    attesters(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;
    attestingFee(overrides?: CallOverrides): Promise<BigNumber>;
    beginEpochTransition(overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    burnAttestingFee(overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    collectEpochTransitionCompensation(overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    collectedAttestingFee(overrides?: CallOverrides): Promise<BigNumber>;
    currentEpoch(overrides?: CallOverrides): Promise<BigNumber>;
    epochLength(overrides?: CallOverrides): Promise<BigNumber>;
    epochTransitionCompensation(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;
    getProofIndex(arg0: BytesLike, overrides?: CallOverrides): Promise<BigNumber>;
    hasUserSignedUp(arg0: BigNumberish, overrides?: CallOverrides): Promise<boolean>;
    hashEpochKeyProof(_input: UnirepObjs.EpochKeyProofStruct, overrides?: CallOverrides): Promise<string>;
    hashProcessAttestationsProof(_outputBlindedUserState: BigNumberish, _outputBlindedHashChain: BigNumberish, _inputBlindedUserState: BigNumberish, _proof: BigNumberish[], overrides?: CallOverrides): Promise<string>;
    hashReputationProof(_input: UnirepObjs.ReputationProofStruct, overrides?: CallOverrides): Promise<string>;
    hashSignUpProof(_input: UnirepObjs.SignUpProofStruct, overrides?: CallOverrides): Promise<string>;
    hashStartTransitionProof(_blindedUserState: BigNumberish, _blindedHashChain: BigNumberish, _globalStateTree: BigNumberish, _proof: BigNumberish[], overrides?: CallOverrides): Promise<string>;
    hashUserStateTransitionProof(_input: UnirepObjs.UserTransitionProofStruct, overrides?: CallOverrides): Promise<string>;
    latestEpochTransitionTime(overrides?: CallOverrides): Promise<BigNumber>;
    maxAttesters(overrides?: CallOverrides): Promise<BigNumber>;
    maxEpochKey(overrides?: CallOverrides): Promise<BigNumber>;
    maxReputationBudget(overrides?: CallOverrides): Promise<number>;
    maxUsers(overrides?: CallOverrides): Promise<BigNumber>;
    nextAttesterId(overrides?: CallOverrides): Promise<BigNumber>;
    numEpochKeyNoncePerEpoch(overrides?: CallOverrides): Promise<number>;
    numUserSignUps(overrides?: CallOverrides): Promise<BigNumber>;
    processAttestations(_outputBlindedUserState: BigNumberish, _outputBlindedHashChain: BigNumberish, _inputBlindedUserState: BigNumberish, _proof: BigNumberish[], overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    setAirdropAmount(_airdropAmount: BigNumberish, overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    spendReputation(_input: UnirepObjs.ReputationProofStruct, overrides?: PayableOverrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    startUserStateTransition(_blindedUserState: BigNumberish, _blindedHashChain: BigNumberish, _globalStateTree: BigNumberish, _proof: BigNumberish[], overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    submitAttestation(attestation: UnirepObjs.AttestationStruct, epochKey: BigNumberish, toProofIndex: BigNumberish, fromProofIndex: BigNumberish, overrides?: PayableOverrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    submitAttestationViaRelayer(attester: string, signature: BytesLike, attestation: UnirepObjs.AttestationStruct, epochKey: BigNumberish, toProofIndex: BigNumberish, fromProofIndex: BigNumberish, overrides?: PayableOverrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    submitEpochKeyProof(_input: UnirepObjs.EpochKeyProofStruct, overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    treeDepths(overrides?: CallOverrides): Promise<[
        number,
        number,
        number
    ] & {
        globalStateTreeDepth: number;
        userStateTreeDepth: number;
        epochTreeDepth: number;
    }>;
    unpackProof(_proof: BigNumberish[], overrides?: CallOverrides): Promise<[
        [
            BigNumber,
            BigNumber
        ],
        [
            [BigNumber, BigNumber],
            [BigNumber, BigNumber]
        ],
        [
            BigNumber,
            BigNumber
        ]
    ]>;
    updateUserStateRoot(_proof: UnirepObjs.UserTransitionProofStruct, proofIndexRecords: BigNumberish[], overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    userSignUp(_identityCommitment: BigNumberish, overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    verifyEpochKeyValidity(_input: UnirepObjs.EpochKeyProofStruct, overrides?: CallOverrides): Promise<boolean>;
    verifyProcessAttestationProof(_outputBlindedUserState: BigNumberish, _outputBlindedHashChain: BigNumberish, _inputBlindedUserState: BigNumberish, _proof: BigNumberish[], overrides?: CallOverrides): Promise<boolean>;
    verifyReputation(_input: UnirepObjs.ReputationProofStruct, overrides?: CallOverrides): Promise<boolean>;
    verifyStartTransitionProof(_blindedUserState: BigNumberish, _blindedHashChain: BigNumberish, _GSTRoot: BigNumberish, _proof: BigNumberish[], overrides?: CallOverrides): Promise<boolean>;
    verifyUserSignUp(_input: UnirepObjs.SignUpProofStruct, overrides?: CallOverrides): Promise<boolean>;
    verifyUserStateTransition(_input: UnirepObjs.UserTransitionProofStruct, overrides?: CallOverrides): Promise<boolean>;
    callStatic: {
        airdropAmount(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;
        airdropEpochKey(_input: UnirepObjs.SignUpProofStruct, overrides?: CallOverrides): Promise<void>;
        attesterSignUp(overrides?: CallOverrides): Promise<void>;
        attesterSignUpViaRelayer(attester: string, signature: BytesLike, overrides?: CallOverrides): Promise<void>;
        attesters(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;
        attestingFee(overrides?: CallOverrides): Promise<BigNumber>;
        beginEpochTransition(overrides?: CallOverrides): Promise<void>;
        burnAttestingFee(overrides?: CallOverrides): Promise<void>;
        collectEpochTransitionCompensation(overrides?: CallOverrides): Promise<void>;
        collectedAttestingFee(overrides?: CallOverrides): Promise<BigNumber>;
        currentEpoch(overrides?: CallOverrides): Promise<BigNumber>;
        epochLength(overrides?: CallOverrides): Promise<BigNumber>;
        epochTransitionCompensation(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;
        getProofIndex(arg0: BytesLike, overrides?: CallOverrides): Promise<BigNumber>;
        hasUserSignedUp(arg0: BigNumberish, overrides?: CallOverrides): Promise<boolean>;
        hashEpochKeyProof(_input: UnirepObjs.EpochKeyProofStruct, overrides?: CallOverrides): Promise<string>;
        hashProcessAttestationsProof(_outputBlindedUserState: BigNumberish, _outputBlindedHashChain: BigNumberish, _inputBlindedUserState: BigNumberish, _proof: BigNumberish[], overrides?: CallOverrides): Promise<string>;
        hashReputationProof(_input: UnirepObjs.ReputationProofStruct, overrides?: CallOverrides): Promise<string>;
        hashSignUpProof(_input: UnirepObjs.SignUpProofStruct, overrides?: CallOverrides): Promise<string>;
        hashStartTransitionProof(_blindedUserState: BigNumberish, _blindedHashChain: BigNumberish, _globalStateTree: BigNumberish, _proof: BigNumberish[], overrides?: CallOverrides): Promise<string>;
        hashUserStateTransitionProof(_input: UnirepObjs.UserTransitionProofStruct, overrides?: CallOverrides): Promise<string>;
        latestEpochTransitionTime(overrides?: CallOverrides): Promise<BigNumber>;
        maxAttesters(overrides?: CallOverrides): Promise<BigNumber>;
        maxEpochKey(overrides?: CallOverrides): Promise<BigNumber>;
        maxReputationBudget(overrides?: CallOverrides): Promise<number>;
        maxUsers(overrides?: CallOverrides): Promise<BigNumber>;
        nextAttesterId(overrides?: CallOverrides): Promise<BigNumber>;
        numEpochKeyNoncePerEpoch(overrides?: CallOverrides): Promise<number>;
        numUserSignUps(overrides?: CallOverrides): Promise<BigNumber>;
        processAttestations(_outputBlindedUserState: BigNumberish, _outputBlindedHashChain: BigNumberish, _inputBlindedUserState: BigNumberish, _proof: BigNumberish[], overrides?: CallOverrides): Promise<void>;
        setAirdropAmount(_airdropAmount: BigNumberish, overrides?: CallOverrides): Promise<void>;
        spendReputation(_input: UnirepObjs.ReputationProofStruct, overrides?: CallOverrides): Promise<void>;
        startUserStateTransition(_blindedUserState: BigNumberish, _blindedHashChain: BigNumberish, _globalStateTree: BigNumberish, _proof: BigNumberish[], overrides?: CallOverrides): Promise<void>;
        submitAttestation(attestation: UnirepObjs.AttestationStruct, epochKey: BigNumberish, toProofIndex: BigNumberish, fromProofIndex: BigNumberish, overrides?: CallOverrides): Promise<void>;
        submitAttestationViaRelayer(attester: string, signature: BytesLike, attestation: UnirepObjs.AttestationStruct, epochKey: BigNumberish, toProofIndex: BigNumberish, fromProofIndex: BigNumberish, overrides?: CallOverrides): Promise<void>;
        submitEpochKeyProof(_input: UnirepObjs.EpochKeyProofStruct, overrides?: CallOverrides): Promise<void>;
        treeDepths(overrides?: CallOverrides): Promise<[
            number,
            number,
            number
        ] & {
            globalStateTreeDepth: number;
            userStateTreeDepth: number;
            epochTreeDepth: number;
        }>;
        unpackProof(_proof: BigNumberish[], overrides?: CallOverrides): Promise<[
            [
                BigNumber,
                BigNumber
            ],
            [
                [BigNumber, BigNumber],
                [BigNumber, BigNumber]
            ],
            [
                BigNumber,
                BigNumber
            ]
        ]>;
        updateUserStateRoot(_proof: UnirepObjs.UserTransitionProofStruct, proofIndexRecords: BigNumberish[], overrides?: CallOverrides): Promise<void>;
        userSignUp(_identityCommitment: BigNumberish, overrides?: CallOverrides): Promise<void>;
        verifyEpochKeyValidity(_input: UnirepObjs.EpochKeyProofStruct, overrides?: CallOverrides): Promise<boolean>;
        verifyProcessAttestationProof(_outputBlindedUserState: BigNumberish, _outputBlindedHashChain: BigNumberish, _inputBlindedUserState: BigNumberish, _proof: BigNumberish[], overrides?: CallOverrides): Promise<boolean>;
        verifyReputation(_input: UnirepObjs.ReputationProofStruct, overrides?: CallOverrides): Promise<boolean>;
        verifyStartTransitionProof(_blindedUserState: BigNumberish, _blindedHashChain: BigNumberish, _GSTRoot: BigNumberish, _proof: BigNumberish[], overrides?: CallOverrides): Promise<boolean>;
        verifyUserSignUp(_input: UnirepObjs.SignUpProofStruct, overrides?: CallOverrides): Promise<boolean>;
        verifyUserStateTransition(_input: UnirepObjs.UserTransitionProofStruct, overrides?: CallOverrides): Promise<boolean>;
    };
    filters: {
        "AttestationSubmitted(uint256,uint256,address,uint8,tuple,uint256,uint256,uint256)"(_epoch?: BigNumberish | null, _epochKey?: BigNumberish | null, _attester?: string | null, _event?: null, _attestation?: null, toProofIndex?: null, fromProofIndex?: null, attestIndex?: null): AttestationSubmittedEventFilter;
        AttestationSubmitted(_epoch?: BigNumberish | null, _epochKey?: BigNumberish | null, _attester?: string | null, _event?: null, _attestation?: null, toProofIndex?: null, fromProofIndex?: null, attestIndex?: null): AttestationSubmittedEventFilter;
        "EpochEnded(uint256)"(_epoch?: BigNumberish | null): EpochEndedEventFilter;
        EpochEnded(_epoch?: BigNumberish | null): EpochEndedEventFilter;
        "IndexedEpochKeyProof(uint256,uint256,uint256,tuple)"(_proofIndex?: BigNumberish | null, _epoch?: BigNumberish | null, _epochKey?: BigNumberish | null, _proof?: null): IndexedEpochKeyProofEventFilter;
        IndexedEpochKeyProof(_proofIndex?: BigNumberish | null, _epoch?: BigNumberish | null, _epochKey?: BigNumberish | null, _proof?: null): IndexedEpochKeyProofEventFilter;
        "IndexedProcessedAttestationsProof(uint256,uint256,uint256,uint256,uint256[8])"(_proofIndex?: BigNumberish | null, _inputBlindedUserState?: BigNumberish | null, _outputBlindedUserState?: null, _outputBlindedHashChain?: null, _proof?: null): IndexedProcessedAttestationsProofEventFilter;
        IndexedProcessedAttestationsProof(_proofIndex?: BigNumberish | null, _inputBlindedUserState?: BigNumberish | null, _outputBlindedUserState?: null, _outputBlindedHashChain?: null, _proof?: null): IndexedProcessedAttestationsProofEventFilter;
        "IndexedReputationProof(uint256,uint256,uint256,tuple)"(_proofIndex?: BigNumberish | null, _epoch?: BigNumberish | null, _epochKey?: BigNumberish | null, _proof?: null): IndexedReputationProofEventFilter;
        IndexedReputationProof(_proofIndex?: BigNumberish | null, _epoch?: BigNumberish | null, _epochKey?: BigNumberish | null, _proof?: null): IndexedReputationProofEventFilter;
        "IndexedStartedTransitionProof(uint256,uint256,uint256,uint256,uint256[8])"(_proofIndex?: BigNumberish | null, _blindedUserState?: BigNumberish | null, _globalStateTree?: BigNumberish | null, _blindedHashChain?: null, _proof?: null): IndexedStartedTransitionProofEventFilter;
        IndexedStartedTransitionProof(_proofIndex?: BigNumberish | null, _blindedUserState?: BigNumberish | null, _globalStateTree?: BigNumberish | null, _blindedHashChain?: null, _proof?: null): IndexedStartedTransitionProofEventFilter;
        "IndexedUserSignedUpProof(uint256,uint256,uint256,tuple)"(_proofIndex?: BigNumberish | null, _epoch?: BigNumberish | null, _epochKey?: BigNumberish | null, _proof?: null): IndexedUserSignedUpProofEventFilter;
        IndexedUserSignedUpProof(_proofIndex?: BigNumberish | null, _epoch?: BigNumberish | null, _epochKey?: BigNumberish | null, _proof?: null): IndexedUserSignedUpProofEventFilter;
        "IndexedUserStateTransitionProof(uint256,tuple,uint256[])"(_proofIndex?: BigNumberish | null, _proof?: null, _proofIndexRecords?: null): IndexedUserStateTransitionProofEventFilter;
        IndexedUserStateTransitionProof(_proofIndex?: BigNumberish | null, _proof?: null, _proofIndexRecords?: null): IndexedUserStateTransitionProofEventFilter;
        "Sequencer(uint256,uint8)"(_epoch?: BigNumberish | null, _event?: null): SequencerEventFilter;
        Sequencer(_epoch?: BigNumberish | null, _event?: null): SequencerEventFilter;
        "UserSignedUp(uint256,uint256,uint256,uint256)"(_epoch?: BigNumberish | null, _identityCommitment?: BigNumberish | null, _attesterId?: null, _airdropAmount?: null): UserSignedUpEventFilter;
        UserSignedUp(_epoch?: BigNumberish | null, _identityCommitment?: BigNumberish | null, _attesterId?: null, _airdropAmount?: null): UserSignedUpEventFilter;
        "UserStateTransitioned(uint256,uint256,uint256)"(_epoch?: BigNumberish | null, _hashedLeaf?: BigNumberish | null, _proofIndex?: null): UserStateTransitionedEventFilter;
        UserStateTransitioned(_epoch?: BigNumberish | null, _hashedLeaf?: BigNumberish | null, _proofIndex?: null): UserStateTransitionedEventFilter;
    };
    estimateGas: {
        airdropAmount(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;
        airdropEpochKey(_input: UnirepObjs.SignUpProofStruct, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        attesterSignUp(overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        attesterSignUpViaRelayer(attester: string, signature: BytesLike, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        attesters(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;
        attestingFee(overrides?: CallOverrides): Promise<BigNumber>;
        beginEpochTransition(overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        burnAttestingFee(overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        collectEpochTransitionCompensation(overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        collectedAttestingFee(overrides?: CallOverrides): Promise<BigNumber>;
        currentEpoch(overrides?: CallOverrides): Promise<BigNumber>;
        epochLength(overrides?: CallOverrides): Promise<BigNumber>;
        epochTransitionCompensation(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;
        getProofIndex(arg0: BytesLike, overrides?: CallOverrides): Promise<BigNumber>;
        hasUserSignedUp(arg0: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
        hashEpochKeyProof(_input: UnirepObjs.EpochKeyProofStruct, overrides?: CallOverrides): Promise<BigNumber>;
        hashProcessAttestationsProof(_outputBlindedUserState: BigNumberish, _outputBlindedHashChain: BigNumberish, _inputBlindedUserState: BigNumberish, _proof: BigNumberish[], overrides?: CallOverrides): Promise<BigNumber>;
        hashReputationProof(_input: UnirepObjs.ReputationProofStruct, overrides?: CallOverrides): Promise<BigNumber>;
        hashSignUpProof(_input: UnirepObjs.SignUpProofStruct, overrides?: CallOverrides): Promise<BigNumber>;
        hashStartTransitionProof(_blindedUserState: BigNumberish, _blindedHashChain: BigNumberish, _globalStateTree: BigNumberish, _proof: BigNumberish[], overrides?: CallOverrides): Promise<BigNumber>;
        hashUserStateTransitionProof(_input: UnirepObjs.UserTransitionProofStruct, overrides?: CallOverrides): Promise<BigNumber>;
        latestEpochTransitionTime(overrides?: CallOverrides): Promise<BigNumber>;
        maxAttesters(overrides?: CallOverrides): Promise<BigNumber>;
        maxEpochKey(overrides?: CallOverrides): Promise<BigNumber>;
        maxReputationBudget(overrides?: CallOverrides): Promise<BigNumber>;
        maxUsers(overrides?: CallOverrides): Promise<BigNumber>;
        nextAttesterId(overrides?: CallOverrides): Promise<BigNumber>;
        numEpochKeyNoncePerEpoch(overrides?: CallOverrides): Promise<BigNumber>;
        numUserSignUps(overrides?: CallOverrides): Promise<BigNumber>;
        processAttestations(_outputBlindedUserState: BigNumberish, _outputBlindedHashChain: BigNumberish, _inputBlindedUserState: BigNumberish, _proof: BigNumberish[], overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        setAirdropAmount(_airdropAmount: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        spendReputation(_input: UnirepObjs.ReputationProofStruct, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        startUserStateTransition(_blindedUserState: BigNumberish, _blindedHashChain: BigNumberish, _globalStateTree: BigNumberish, _proof: BigNumberish[], overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        submitAttestation(attestation: UnirepObjs.AttestationStruct, epochKey: BigNumberish, toProofIndex: BigNumberish, fromProofIndex: BigNumberish, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        submitAttestationViaRelayer(attester: string, signature: BytesLike, attestation: UnirepObjs.AttestationStruct, epochKey: BigNumberish, toProofIndex: BigNumberish, fromProofIndex: BigNumberish, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        submitEpochKeyProof(_input: UnirepObjs.EpochKeyProofStruct, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        treeDepths(overrides?: CallOverrides): Promise<BigNumber>;
        unpackProof(_proof: BigNumberish[], overrides?: CallOverrides): Promise<BigNumber>;
        updateUserStateRoot(_proof: UnirepObjs.UserTransitionProofStruct, proofIndexRecords: BigNumberish[], overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        userSignUp(_identityCommitment: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        verifyEpochKeyValidity(_input: UnirepObjs.EpochKeyProofStruct, overrides?: CallOverrides): Promise<BigNumber>;
        verifyProcessAttestationProof(_outputBlindedUserState: BigNumberish, _outputBlindedHashChain: BigNumberish, _inputBlindedUserState: BigNumberish, _proof: BigNumberish[], overrides?: CallOverrides): Promise<BigNumber>;
        verifyReputation(_input: UnirepObjs.ReputationProofStruct, overrides?: CallOverrides): Promise<BigNumber>;
        verifyStartTransitionProof(_blindedUserState: BigNumberish, _blindedHashChain: BigNumberish, _GSTRoot: BigNumberish, _proof: BigNumberish[], overrides?: CallOverrides): Promise<BigNumber>;
        verifyUserSignUp(_input: UnirepObjs.SignUpProofStruct, overrides?: CallOverrides): Promise<BigNumber>;
        verifyUserStateTransition(_input: UnirepObjs.UserTransitionProofStruct, overrides?: CallOverrides): Promise<BigNumber>;
    };
    populateTransaction: {
        airdropAmount(arg0: string, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        airdropEpochKey(_input: UnirepObjs.SignUpProofStruct, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        attesterSignUp(overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        attesterSignUpViaRelayer(attester: string, signature: BytesLike, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        attesters(arg0: string, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        attestingFee(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        beginEpochTransition(overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        burnAttestingFee(overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        collectEpochTransitionCompensation(overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        collectedAttestingFee(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        currentEpoch(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        epochLength(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        epochTransitionCompensation(arg0: string, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getProofIndex(arg0: BytesLike, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        hasUserSignedUp(arg0: BigNumberish, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        hashEpochKeyProof(_input: UnirepObjs.EpochKeyProofStruct, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        hashProcessAttestationsProof(_outputBlindedUserState: BigNumberish, _outputBlindedHashChain: BigNumberish, _inputBlindedUserState: BigNumberish, _proof: BigNumberish[], overrides?: CallOverrides): Promise<PopulatedTransaction>;
        hashReputationProof(_input: UnirepObjs.ReputationProofStruct, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        hashSignUpProof(_input: UnirepObjs.SignUpProofStruct, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        hashStartTransitionProof(_blindedUserState: BigNumberish, _blindedHashChain: BigNumberish, _globalStateTree: BigNumberish, _proof: BigNumberish[], overrides?: CallOverrides): Promise<PopulatedTransaction>;
        hashUserStateTransitionProof(_input: UnirepObjs.UserTransitionProofStruct, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        latestEpochTransitionTime(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        maxAttesters(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        maxEpochKey(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        maxReputationBudget(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        maxUsers(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        nextAttesterId(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        numEpochKeyNoncePerEpoch(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        numUserSignUps(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        processAttestations(_outputBlindedUserState: BigNumberish, _outputBlindedHashChain: BigNumberish, _inputBlindedUserState: BigNumberish, _proof: BigNumberish[], overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        setAirdropAmount(_airdropAmount: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        spendReputation(_input: UnirepObjs.ReputationProofStruct, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        startUserStateTransition(_blindedUserState: BigNumberish, _blindedHashChain: BigNumberish, _globalStateTree: BigNumberish, _proof: BigNumberish[], overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        submitAttestation(attestation: UnirepObjs.AttestationStruct, epochKey: BigNumberish, toProofIndex: BigNumberish, fromProofIndex: BigNumberish, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        submitAttestationViaRelayer(attester: string, signature: BytesLike, attestation: UnirepObjs.AttestationStruct, epochKey: BigNumberish, toProofIndex: BigNumberish, fromProofIndex: BigNumberish, overrides?: PayableOverrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        submitEpochKeyProof(_input: UnirepObjs.EpochKeyProofStruct, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        treeDepths(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        unpackProof(_proof: BigNumberish[], overrides?: CallOverrides): Promise<PopulatedTransaction>;
        updateUserStateRoot(_proof: UnirepObjs.UserTransitionProofStruct, proofIndexRecords: BigNumberish[], overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        userSignUp(_identityCommitment: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        verifyEpochKeyValidity(_input: UnirepObjs.EpochKeyProofStruct, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        verifyProcessAttestationProof(_outputBlindedUserState: BigNumberish, _outputBlindedHashChain: BigNumberish, _inputBlindedUserState: BigNumberish, _proof: BigNumberish[], overrides?: CallOverrides): Promise<PopulatedTransaction>;
        verifyReputation(_input: UnirepObjs.ReputationProofStruct, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        verifyStartTransitionProof(_blindedUserState: BigNumberish, _blindedHashChain: BigNumberish, _GSTRoot: BigNumberish, _proof: BigNumberish[], overrides?: CallOverrides): Promise<PopulatedTransaction>;
        verifyUserSignUp(_input: UnirepObjs.SignUpProofStruct, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        verifyUserStateTransition(_input: UnirepObjs.UserTransitionProofStruct, overrides?: CallOverrides): Promise<PopulatedTransaction>;
    };
}
