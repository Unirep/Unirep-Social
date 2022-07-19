import { BigNumberish, ethers } from 'ethers'
import { ZkIdentity } from '@unirep/crypto'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import * as config from '@unirep/circuits'
import { schema, genReputationNullifier, UserState } from '@unirep/core'
import { getUnirepContract } from '@unirep/contracts'
import { DB, SQLiteConnector } from 'anondb/node'

export type Field = BigNumberish

export const getTreeDepthsForTesting = (deployEnv: string = 'circuit') => {
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

export const findValidNonce = async (
    userState: UserState,
    repNullifiersAmount: number,
    epoch: number,
    attesterId: BigInt
): Promise<BigInt[]> => {
    const nonceList: BigInt[] = []
    let nonce = 0
    while (nonceList.length < repNullifiersAmount) {
        if (
            !(await userState.nullifierExist(
                genReputationNullifier(
                    userState.id.identityNullifier,
                    epoch,
                    nonce,
                    attesterId
                )
            ))
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

export const genUserState = async (
    provider: ethers.providers.Provider,
    address: string,
    userIdentity: ZkIdentity,
    _db?: DB
) => {
    const unirepContract = getUnirepContract(address, provider)
    let db: DB = _db ?? (await SQLiteConnector.create(schema, ':memory:'))
    const userState = new UserState(
        db,
        defaultProver,
        unirepContract,
        userIdentity
    )
    await userState.start()
    await userState.waitForSync()
    return userState
}
