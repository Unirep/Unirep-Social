import { BigNumber, BigNumberish, ethers } from 'ethers'
import * as crypto from '@unirep/crypto'
import * as config from '@unirep/circuits'
import { genReputationNullifier, UserState } from '@unirep/core'
import * as circuit from '@unirep/circuits'
import { Unirep__factory as UnirepFactory } from '../typechain/factories/Unirep__factory'

export type Field = BigNumberish

const add0x = (str: string): string => {
    return str.startsWith('0x') ? str : '0x' + str
}

class Attestation {
    public attesterId: BigNumber
    public posRep: BigNumber
    public negRep: BigNumber
    public graffiti: BigNumber
    public signUp: BigNumber

    constructor(
        _attesterId: BigInt | BigNumberish,
        _posRep: BigInt | BigNumberish,
        _negRep: BigInt | BigNumberish,
        _graffiti: BigInt | BigNumberish,
        _signUp: BigInt | BigNumberish
    ) {
        this.attesterId = ethers.BigNumber.from(_attesterId)
        this.posRep = ethers.BigNumber.from(_posRep)
        this.negRep = ethers.BigNumber.from(_negRep)
        this.graffiti = ethers.BigNumber.from(_graffiti)
        this.signUp = ethers.BigNumber.from(_signUp)
    }

    public hash = (): BigInt => {
        return crypto.hash5([
            this.attesterId.toBigInt(),
            this.posRep.toBigInt(),
            this.negRep.toBigInt(),
            this.graffiti.toBigInt(),
            this.signUp.toBigInt(),
        ])
    }
}

// the struct EpochKeyProof in UnirepObjs
class EpochKeyProof {
    public globalStateTree: Field
    public epoch: Field
    public epochKey: Field
    public proof: Field[]
    private publicSignals: Field[]

    constructor(_publicSignals: Field[], _proof: crypto.SnarkProof) {
        const formattedProof: any[] =
            circuit.formatProofForVerifierContract(_proof)
        this.globalStateTree = _publicSignals[0]
        this.epoch = _publicSignals[1]
        this.epochKey = _publicSignals[2]
        this.proof = formattedProof
        this.publicSignals = _publicSignals
    }

    public verify = (): Promise<boolean> => {
        const proof_ = circuit.formatProofForSnarkjsVerification(
            this.proof.map((n) => n.toString())
        )
        return circuit.verifyProof(
            circuit.Circuit.verifyEpochKey,
            proof_,
            this.publicSignals.map((n) => BigInt(n.toString()))
        )
    }

    public hash = () => {
        const iface = new ethers.utils.Interface(UnirepFactory.abi)
        const abiEncoder = iface.encodeFunctionData('hashEpochKeyProof', [this])
        return ethers.utils.keccak256(rmFuncSigHash(abiEncoder))
    }
}

class ReputationProof {
    public repNullifiers: Field[]
    public epoch: Field
    public epochKey: Field
    public globalStateTree: Field
    public attesterId: Field
    public proveReputationAmount: Field
    public minRep: Field
    public proveGraffiti: Field
    public graffitiPreImage: Field
    public proof: Field[]
    private publicSignals: Field[]

    constructor(_publicSignals: Field[], _proof: crypto.SnarkProof) {
        const formattedProof: any[] =
            circuit.formatProofForVerifierContract(_proof)
        this.repNullifiers = _publicSignals.slice(
            0,
            config.MAX_REPUTATION_BUDGET
        )
        this.epoch = _publicSignals[config.MAX_REPUTATION_BUDGET]
        this.epochKey = _publicSignals[config.MAX_REPUTATION_BUDGET + 1]
        this.globalStateTree = _publicSignals[config.MAX_REPUTATION_BUDGET + 2]
        this.attesterId = _publicSignals[config.MAX_REPUTATION_BUDGET + 3]
        this.proveReputationAmount =
            _publicSignals[config.MAX_REPUTATION_BUDGET + 4]
        this.minRep = _publicSignals[config.MAX_REPUTATION_BUDGET + 5]
        this.proveGraffiti = _publicSignals[config.MAX_REPUTATION_BUDGET + 6]
        this.graffitiPreImage = _publicSignals[config.MAX_REPUTATION_BUDGET + 7]
        this.proof = formattedProof
        this.publicSignals = _publicSignals
    }

    public verify = (): Promise<boolean> => {
        const proof_ = circuit.formatProofForSnarkjsVerification(
            this.proof.map((n) => n.toString())
        )
        return circuit.verifyProof(
            circuit.Circuit.proveReputation,
            proof_,
            this.publicSignals.map((n) => BigInt(n.toString()))
        )
    }

    public hash = () => {
        // array length should be fixed
        const abiEncoder = ethers.utils.defaultAbiCoder.encode(
            [
                `tuple(uint256[${config.MAX_REPUTATION_BUDGET}] repNullifiers,
                    uint256 epoch,
                    uint256 epochKey,
                    uint256 globalStateTree,
                    uint256 attesterId,
                    uint256 proveReputationAmount,
                    uint256 minRep,
                    uint256 proveGraffiti,
                    uint256 graffitiPreImage,
                    uint256[8] proof)
            `,
            ],
            [this]
        )
        return ethers.utils.keccak256(abiEncoder)
    }
}

class SignUpProof {
    public epoch: Field
    public epochKey: Field
    public globalStateTree: Field
    public attesterId: Field
    public userHasSignedUp: Field
    public proof: Field[]
    private publicSignals: Field[]

    constructor(_publicSignals: Field[], _proof: crypto.SnarkProof) {
        const formattedProof: any[] =
            circuit.formatProofForVerifierContract(_proof)
        this.epoch = _publicSignals[0]
        this.epochKey = _publicSignals[1]
        this.globalStateTree = _publicSignals[2]
        this.attesterId = _publicSignals[3]
        this.userHasSignedUp = _publicSignals[4]
        this.proof = formattedProof
        this.publicSignals = _publicSignals
    }

    public verify = (): Promise<boolean> => {
        const proof_ = circuit.formatProofForSnarkjsVerification(
            this.proof.map((n) => n.toString())
        )
        return circuit.verifyProof(
            circuit.Circuit.proveUserSignUp,
            proof_,
            this.publicSignals.map((n) => BigInt(n.toString()))
        )
    }

    public hash = () => {
        const iface = new ethers.utils.Interface(UnirepFactory.abi)
        const abiEncoder = iface.encodeFunctionData('hashSignUpProof', [this])
        return ethers.utils.keccak256(rmFuncSigHash(abiEncoder))
    }
}

class UserTransitionProof {
    public newGlobalStateTreeLeaf: Field
    public epkNullifiers: Field[]
    public transitionFromEpoch: Field
    public blindedUserStates: Field[]
    public fromGlobalStateTree: Field
    public blindedHashChains: Field[]
    public fromEpochTree: Field
    public proof: Field[]
    private publicSignals: Field[]

    constructor(_publicSignals: Field[], _proof: crypto.SnarkProof) {
        const formattedProof: any[] =
            circuit.formatProofForVerifierContract(_proof)
        this.newGlobalStateTreeLeaf = _publicSignals[0]
        this.epkNullifiers = []
        this.blindedUserStates = []
        this.blindedHashChains = []
        for (let i = 0; i < config.NUM_EPOCH_KEY_NONCE_PER_EPOCH; i++) {
            this.epkNullifiers.push(_publicSignals[1 + i])
        }
        this.transitionFromEpoch =
            _publicSignals[1 + config.NUM_EPOCH_KEY_NONCE_PER_EPOCH]
        this.blindedUserStates.push(
            _publicSignals[2 + config.NUM_EPOCH_KEY_NONCE_PER_EPOCH]
        )
        this.blindedUserStates.push(
            _publicSignals[3 + config.NUM_EPOCH_KEY_NONCE_PER_EPOCH]
        )
        this.fromGlobalStateTree =
            _publicSignals[4 + config.NUM_EPOCH_KEY_NONCE_PER_EPOCH]
        for (let i = 0; i < config.NUM_EPOCH_KEY_NONCE_PER_EPOCH; i++) {
            this.blindedHashChains.push(
                _publicSignals[5 + config.NUM_EPOCH_KEY_NONCE_PER_EPOCH + i]
            )
        }
        this.fromEpochTree =
            _publicSignals[5 + config.NUM_EPOCH_KEY_NONCE_PER_EPOCH * 2]
        this.proof = formattedProof
        this.publicSignals = _publicSignals
    }

    public verify = (): Promise<boolean> => {
        const proof_ = circuit.formatProofForSnarkjsVerification(
            this.proof.map((n) => n.toString())
        )
        return circuit.verifyProof(
            circuit.Circuit.userStateTransition,
            proof_,
            this.publicSignals.map((n) => BigInt(n.toString()))
        )
    }

    // public hash = () => {
    //     // array length should be fixed
    //     const abiEncoder = ethers.utils.defaultAbiCoder.encode(
    //         [`tuple(uint256 newGlobalStateTreeLeaf,
    //                 uint256[${numEpochKeyNoncePerEpoch}] epkNullifiers,
    //                 uint256 transitionFromEpoch,
    //                 uint256[2] blindedUserStates,
    //                 uint256 fromGlobalStateTree,
    //                 uint256[${numEpochKeyNoncePerEpoch}] blindedHashChains,
    //                 uint256 fromEpochTree,
    //                 uint256[8] proof)
    //         `],
    //         [this]
    //     )
    //     return ethers.utils.keccak256(abiEncoder)
    // }
}

const rmFuncSigHash = (abiEncoder: string) => {
    return add0x(abiEncoder.slice(10))
}

const getTreeDepthsForTesting = (deployEnv: string = 'circuit') => {
    if (deployEnv === 'contract') {
        return {
            userStateTreeDepth: config.USER_STATE_TREE_DEPTH,
            globalStateTreeDepth: config.GLOBAL_STATE_TREE_DEPTH,
            epochTreeDepth: config.EPOCH_TREE_DEPTH,
        }
    } else if (deployEnv === 'circuit') {
        return {
            userStateTreeDepth: config.USER_STATE_TREE_DEPTH,
            globalStateTreeDepth: config.GLOBAL_STATE_TREE_DEPTH,
            epochTreeDepth: config.EPOCH_TREE_DEPTH,
        }
    } else {
        throw new Error('Only contract and circuit testing env are supported')
    }
}

const toCompleteHexString = (str: string, len?: number): string => {
    str = add0x(str)
    if (len) str = ethers.utils.hexZeroPad(str, len)
    return str
}

const SMT_ZERO_LEAF = crypto.hashLeftRight(BigInt(0), BigInt(0))
const SMT_ONE_LEAF = crypto.hashLeftRight(BigInt(1), BigInt(0))

const genNewSMT = async (
    treeDepth: number,
    defaultLeafHash: BigInt
): Promise<crypto.SparseMerkleTree> => {
    return new crypto.SparseMerkleTree(treeDepth, defaultLeafHash)
}

const genNewEpochTree = async (
    deployEnv: string = 'contract'
): Promise<crypto.SparseMerkleTree> => {
    let _epochTreeDepth
    if (deployEnv === 'contract') {
        _epochTreeDepth = config.EPOCH_TREE_DEPTH
    } else if (deployEnv === 'circuit') {
        _epochTreeDepth = config.EPOCH_TREE_DEPTH
    } else {
        throw new Error('Only contract and circuit testing env are supported')
    }
    const defaultOTSMTHash = SMT_ONE_LEAF
    return genNewSMT(_epochTreeDepth, defaultOTSMTHash)
}

const defaultUserStateLeaf = crypto.hash5([
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
])

const computeEmptyUserStateRoot = (treeDepth: number): BigInt => {
    const t = new crypto.IncrementalMerkleTree(treeDepth)
    return t.root
}

const genNewUserStateTree = async (
    deployEnv: string = 'contract'
): Promise<crypto.SparseMerkleTree> => {
    let _userStateTreeDepth
    if (deployEnv === 'contract') {
        _userStateTreeDepth = config.USER_STATE_TREE_DEPTH
    } else if (deployEnv === 'circuit') {
        _userStateTreeDepth = config.USER_STATE_TREE_DEPTH
    } else {
        throw new Error('Only contract and circuit testing env are supported')
    }

    return genNewSMT(_userStateTreeDepth, defaultUserStateLeaf)
}

const findValidNonce = (
    userState: UserState,
    repNullifiersAmount: number,
    epoch: number,
    attesterId: BigInt
): BigInt[] => {
    const nonceList: BigInt[] = []
    let nonce = 0
    while (nonceList.length < repNullifiersAmount) {
        if (
            !userState.nullifierExist(
                genReputationNullifier(
                    userState.id.identityNullifier,
                    epoch,
                    nonce,
                    attesterId
                )
            )
        ) {
            nonceList.push(BigInt(nonce))
        }
        nonce++
    }
    for (let i = repNullifiersAmount; i < config.MAX_REPUTATION_BUDGET; i++) {
        nonceList.push(BigInt(-1))
    }
    return nonceList
}

const genRandomList = (length): BigInt[] => {
    const array: BigInt[] = []
    for (let i = 0; i < length; i++) {
        array.push(crypto.genRandomSalt())
    }
    return array
}

export {
    Attestation,
    EpochKeyProof,
    ReputationProof,
    SignUpProof,
    UserTransitionProof,
    SMT_ONE_LEAF,
    SMT_ZERO_LEAF,
    computeEmptyUserStateRoot,
    defaultUserStateLeaf,
    getTreeDepthsForTesting,
    genNewEpochTree,
    genNewUserStateTree,
    genNewSMT,
    toCompleteHexString,
    findValidNonce,
    genRandomList,
}
