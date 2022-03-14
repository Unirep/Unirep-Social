import {
    BigNumber,
    BigNumberish,
    ethers
} from 'ethers'
import Keyv from "keyv"
import * as crypto from '@unirep/crypto'
import * as config from '@unirep/unirep'
import {
    genReputationNullifier,
    UserState
} from '@unirep/unirep'
import * as circuit from '@unirep/circuits'
import { Unirep__factory as UnirepFactory } from '../typechain/factories/Unirep__factory'

export type Field = BigNumberish

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
        _signUp: BigInt | BigNumberish,
    ) {
        this.attesterId = ethers.BigNumber.from(_attesterId)
        this.posRep = ethers.BigNumber.from(_posRep);
        this.negRep = ethers.BigNumber.from(_negRep);
        this.graffiti = ethers.BigNumber.from(_graffiti);
        this.signUp = ethers.BigNumber.from(_signUp);
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

    constructor(
        _publicSignals: Field[],
        _proof: crypto.SnarkProof
    ) {
        const formattedProof: any[] = circuit.formatProofForVerifierContract(_proof)
        this.globalStateTree = _publicSignals[0]
        this.epoch = _publicSignals[1]
        this.epochKey = _publicSignals[2]
        this.proof = formattedProof
        this.publicSignals = _publicSignals
    }

    public verify = (): Promise<boolean> => {
        const proof_ = circuit.formatProofForSnarkjsVerification(this.proof.map(n => n.toString()))
        return circuit.verifyProof(circuit.Circuit.verifyEpochKey, proof_, this.publicSignals.map(n => BigInt(n.toString())))
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

    constructor(
        _publicSignals: Field[],
        _proof: crypto.SnarkProof
    ) {
        const formattedProof: any[] = circuit.formatProofForVerifierContract(_proof)
        this.repNullifiers = _publicSignals.slice(0, config.maxReputationBudget)
        this.epoch = _publicSignals[config.maxReputationBudget]
        this.epochKey = _publicSignals[config.maxReputationBudget + 1]
        this.globalStateTree = _publicSignals[config.maxReputationBudget + 2]
        this.attesterId = _publicSignals[config.maxReputationBudget + 3]
        this.proveReputationAmount = _publicSignals[config.maxReputationBudget + 4]
        this.minRep = _publicSignals[config.maxReputationBudget + 5]
        this.proveGraffiti = _publicSignals[config.maxReputationBudget + 6]
        this.graffitiPreImage = _publicSignals[config.maxReputationBudget + 7]
        this.proof = formattedProof
        this.publicSignals = _publicSignals
    }

    public verify = (): Promise<boolean> => {
        const proof_ = circuit.formatProofForSnarkjsVerification(this.proof.map(n => n.toString()))
        return circuit.verifyProof(circuit.Circuit.proveReputation, proof_, this.publicSignals.map(n => BigInt(n.toString())))
    }

    public hash = () => {
        // array length should be fixed
        const abiEncoder = ethers.utils.defaultAbiCoder.encode(
            [`tuple(uint256[${config.maxReputationBudget}] repNullifiers,
                    uint256 epoch,
                    uint256 epochKey, 
                    uint256 globalStateTree,
                    uint256 attesterId,
                    uint256 proveReputationAmount,
                    uint256 minRep,
                    uint256 proveGraffiti,
                    uint256 graffitiPreImage,
                    uint256[8] proof)
            `],
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

    constructor(
        _publicSignals: Field[],
        _proof: crypto.SnarkProof
    ) {
        const formattedProof: any[] = circuit.formatProofForVerifierContract(_proof)
        this.epoch = _publicSignals[0]
        this.epochKey = _publicSignals[1]
        this.globalStateTree = _publicSignals[2]
        this.attesterId = _publicSignals[3]
        this.userHasSignedUp = _publicSignals[4]
        this.proof = formattedProof
        this.publicSignals = _publicSignals
    }

    public verify = (): Promise<boolean> => {
        const proof_ = circuit.formatProofForSnarkjsVerification(this.proof.map(n => n.toString()))
        return circuit.verifyProof(circuit.Circuit.proveUserSignUp, proof_, this.publicSignals.map(n => BigInt(n.toString())))
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

    constructor(
        _publicSignals: Field[],
        _proof: crypto.SnarkProof
    ) {
        const formattedProof: any[] = circuit.formatProofForVerifierContract(_proof)
        this.newGlobalStateTreeLeaf = _publicSignals[0]
        this.epkNullifiers = []
        this.blindedUserStates = []
        this.blindedHashChains = []
        for (let i = 0; i < config.numEpochKeyNoncePerEpoch; i++) {
            this.epkNullifiers.push(_publicSignals[1 + i])
        }
        this.transitionFromEpoch = _publicSignals[1 + config.numEpochKeyNoncePerEpoch]
        this.blindedUserStates.push(_publicSignals[2 + config.numEpochKeyNoncePerEpoch])
        this.blindedUserStates.push(_publicSignals[3 + config.numEpochKeyNoncePerEpoch])
        this.fromGlobalStateTree = _publicSignals[4 + config.numEpochKeyNoncePerEpoch]
        for (let i = 0; i < config.numEpochKeyNoncePerEpoch; i++) {
            this.blindedHashChains.push(_publicSignals[5 + config.numEpochKeyNoncePerEpoch + i])
        }
        this.fromEpochTree = _publicSignals[5 + config.numEpochKeyNoncePerEpoch * 2]
        this.proof = formattedProof
        this.publicSignals = _publicSignals
    }

    public verify = (): Promise<boolean> => {
        const proof_ = circuit.formatProofForSnarkjsVerification(this.proof.map(n => n.toString()))
        return circuit.verifyProof(circuit.Circuit.userStateTransition, proof_, this.publicSignals.map(n => BigInt(n.toString())))
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
    return crypto.add0x(abiEncoder.slice(10,))
}

const getTreeDepthsForTesting = (deployEnv: string = "circuit") => {
    if (deployEnv === 'contract') {
        return {
            "userStateTreeDepth": config.userStateTreeDepth,
            "globalStateTreeDepth": config.globalStateTreeDepth,
            "epochTreeDepth": config.epochTreeDepth,
        }
    } else if (deployEnv === 'circuit') {
        return {
            "userStateTreeDepth": config.circuitUserStateTreeDepth,
            "globalStateTreeDepth": config.circuitGlobalStateTreeDepth,
            "epochTreeDepth": config.circuitEpochTreeDepth,
        }
    } else {
        throw new Error('Only contract and circuit testing env are supported')
    }
}

const toCompleteHexString = (str: string, len?: number): string => {
    str = crypto.add0x(str)
    if (len) str = ethers.utils.hexZeroPad(str, len)
    return str
}

const SMT_ZERO_LEAF = crypto.hashLeftRight(BigInt(0), BigInt(0))
const SMT_ONE_LEAF = crypto.hashLeftRight(BigInt(1), BigInt(0))

const genNewSMT = async (treeDepth: number, defaultLeafHash: BigInt): Promise<crypto.SparseMerkleTreeImpl> => {
    return crypto.SparseMerkleTreeImpl.create(
        new Keyv(),
        treeDepth,
        defaultLeafHash,
    )
}

const genNewEpochTree = async (deployEnv: string = "contract"): Promise<crypto.SparseMerkleTreeImpl> => {
    let _epochTreeDepth
    if (deployEnv === 'contract') {
        _epochTreeDepth = config.epochTreeDepth
    } else if (deployEnv === 'circuit') {
        _epochTreeDepth = config.circuitEpochTreeDepth
    } else {
        throw new Error('Only contract and circuit testing env are supported')
    }
    const defaultOTSMTHash = SMT_ONE_LEAF
    return genNewSMT(_epochTreeDepth, defaultOTSMTHash)
}

const defaultUserStateLeaf = crypto.hash5([BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)])

const computeEmptyUserStateRoot = (treeDepth: number): BigInt => {
    const t = new crypto.IncrementalQuinTree(
        treeDepth,
        defaultUserStateLeaf,
        2,
    )
    return t.root
}

const genNewUserStateTree = async (deployEnv: string = "contract"): Promise<crypto.SparseMerkleTreeImpl> => {
    let _userStateTreeDepth
    if (deployEnv === 'contract') {
        _userStateTreeDepth = config.userStateTreeDepth
    } else if (deployEnv === 'circuit') {
        _userStateTreeDepth = config.circuitUserStateTreeDepth
    } else {
        throw new Error('Only contract and circuit testing env are supported')
    }

    return genNewSMT(_userStateTreeDepth, defaultUserStateLeaf)
}

const findValidNonce = (userState: UserState, repNullifiersAmount: number, epoch: number, attesterId: BigInt): BigInt[] => {
    const nonceList: BigInt[] = []
    let nonce = 0
    while (nonceList.length < repNullifiersAmount) {
        if (!userState.nullifierExist(genReputationNullifier(userState.id.identityNullifier, epoch, nonce, attesterId))) {
            nonceList.push(BigInt(nonce))
        }
        nonce++
    }
    for (let i = repNullifiersAmount; i < config.maxReputationBudget; i++) {
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