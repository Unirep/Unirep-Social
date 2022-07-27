import { BigNumberish, ethers } from 'ethers'
import { ZkIdentity } from '@unirep/crypto'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import * as config from '@unirep/circuits'
import { schema, UserState } from '@unirep/core'
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
