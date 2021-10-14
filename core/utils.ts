// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2305 will be reported.
// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'

import UnirepSocial from "../artifacts/contracts/UnirepSocial.sol/UnirepSocial.json"
import { circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitUserStateTreeDepth, epochTreeDepth, globalStateTreeDepth, userStateTreeDepth } from '@unirep/unirep'
import { hash5, hashLeftRight, IncrementalQuinTree, SnarkBigInt } from 'maci-crypto'
import { defaultAirdroppedReputation, defaultCommentReputation, defaultPostReputation } from '../config/socialMedia'

const defaultUserStateLeaf = hash5([BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)])
const SMT_ZERO_LEAF = hashLeftRight(BigInt(0), BigInt(0))
const SMT_ONE_LEAF = hashLeftRight(BigInt(1), BigInt(0))

const computeEmptyUserStateRoot = (treeDepth: number): BigInt => {
    const t = new IncrementalQuinTree(
        treeDepth,
        defaultUserStateLeaf,
        2,
    )
    return t.root
}

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

const deployUnirepSocial = async (
    deployer: ethers.Signer,
    UnirepAddr: string,
    _settings?: any): Promise<ethers.Contract> => {

    console.log('Deploying Unirep Social')

    const _defaultAirdroppedRep = defaultAirdroppedReputation
    const _postReputation = defaultPostReputation
    const _commentReputation = defaultCommentReputation

    const f = await hardhatEthers.getContractFactory(
        "UnirepSocial",
        {
            signer: deployer,
        }
    )
    const c = await (f.deploy(
        UnirepAddr,
        _postReputation,
        _commentReputation,
        _defaultAirdroppedRep,
        {
            gasLimit: 9000000,
        }
    ))

    // Print out deployment info
    console.log("-----------------------------------------------------------------")
    console.log("Bytecode size of Unirep Social:", Math.floor(UnirepSocial.bytecode.length / 2), "bytes")
    let receipt = await c.provider.getTransactionReceipt(c.deployTransaction.hash)
    console.log("Gas cost of deploying Unirep Social:", receipt.gasUsed.toString())
    console.log("-----------------------------------------------------------------")

    return c
}

const genEpochKey = (identityNullifier: SnarkBigInt, epoch: number, nonce: number, _epochTreeDepth: number = epochTreeDepth): SnarkBigInt => {
    const values: any[] = [
        identityNullifier,
        epoch,
        nonce,
        BigInt(0),
        BigInt(0),
    ]
    let epochKey = hash5(values)
    // Adjust epoch key size according to epoch tree depth
    const epochKeyModed = BigInt(epochKey.toString()) % BigInt(2 ** _epochTreeDepth)
    return epochKeyModed
}

export {
    defaultUserStateLeaf,
    SMT_ONE_LEAF,
    SMT_ZERO_LEAF,
    computeEmptyUserStateRoot,
    getTreeDepthsForTesting,
    deployUnirepSocial,
    genEpochKey,
}