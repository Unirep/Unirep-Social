import { ethers } from 'ethers'
import Keyv from "keyv"
import { SparseMerkleTreeImpl, add0x, hash5, hashLeftRight, IncrementalQuinTree, genRandomSalt } from '@unirep/crypto'
import { circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitUserStateTreeDepth, epochTreeDepth, genReputationNullifier, globalStateTreeDepth, maxReputationBudget, UserState, userStateTreeDepth} from '@unirep/unirep'

const getTreeDepthsForTesting = (deployEnv: string = "circuit") => {
    if (deployEnv === 'contract') {
        return {
            "userStateTreeDepth": userStateTreeDepth,
            "globalStateTreeDepth": globalStateTreeDepth,
            "epochTreeDepth": epochTreeDepth,
        }
    } else if (deployEnv === 'circuit') {
        return {
            "userStateTreeDepth": circuitUserStateTreeDepth,
            "globalStateTreeDepth": circuitGlobalStateTreeDepth,
            "epochTreeDepth": circuitEpochTreeDepth,
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

const SMT_ZERO_LEAF = hashLeftRight(BigInt(0), BigInt(0))
const SMT_ONE_LEAF = hashLeftRight(BigInt(1), BigInt(0))

const genNewSMT = async (treeDepth: number, defaultLeafHash: BigInt): Promise<SparseMerkleTreeImpl> => {
    return SparseMerkleTreeImpl.create(
        new Keyv(),
        treeDepth,
        defaultLeafHash,
    )
}

const genNewEpochTree = async (deployEnv: string = "contract"): Promise<SparseMerkleTreeImpl> => {
    let _epochTreeDepth
    if (deployEnv === 'contract') {
        _epochTreeDepth = epochTreeDepth
    } else if (deployEnv === 'circuit') {
        _epochTreeDepth = circuitEpochTreeDepth
    } else {
        throw new Error('Only contract and circuit testing env are supported')
    }
    const defaultOTSMTHash = SMT_ONE_LEAF
    return genNewSMT(_epochTreeDepth, defaultOTSMTHash)
}

const defaultUserStateLeaf = hash5([BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)])

const computeEmptyUserStateRoot = (treeDepth: number): BigInt => {
    const t = new IncrementalQuinTree(
        treeDepth,
        defaultUserStateLeaf,
        2,
    )
    return t.root
}    

const genNewUserStateTree = async (deployEnv: string = "contract"): Promise<SparseMerkleTreeImpl> => {
    let _userStateTreeDepth
    if (deployEnv === 'contract') {
        _userStateTreeDepth = userStateTreeDepth
    } else if (deployEnv === 'circuit') {
        _userStateTreeDepth = circuitUserStateTreeDepth
    } else {
        throw new Error('Only contract and circuit testing env are supported')
    }

    return genNewSMT(_userStateTreeDepth, defaultUserStateLeaf)
}

const findValidNonce = (userState: UserState, repNullifiersAmount: number, epoch: number, attesterId: BigInt): BigInt[] => {
    const nonceList: BigInt[] = []
    let nonce = 0
    while(nonceList.length < repNullifiersAmount) {
        if(!userState.nullifierExist(genReputationNullifier(userState.id.identityNullifier, epoch, nonce, attesterId))){
            nonceList.push(BigInt(nonce))
        }
        nonce ++
    }
    for (let i = repNullifiersAmount; i < maxReputationBudget; i++) {
        nonceList.push(BigInt(-1))
    }
    return nonceList
}

const genRandomList = (length): BigInt[] => {
    const array: BigInt[] = []
    for (let i = 0; i < length; i++) {
        array.push(genRandomSalt())
    }
    return array
}

export {
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