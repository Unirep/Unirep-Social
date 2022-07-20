import { ethers } from 'ethers'
import { ZkIdentity } from '@unirep/crypto'
import { getUnirepContract } from '@unirep/contracts'
import { UserState, schema } from '@unirep/core'
import { DB, SQLiteConnector } from 'anondb/node'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import * as shell from 'shelljs'

const exec = (command: string) => {
    return shell.exec(command, { silent: true })
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

export const genUnirepState = async (
    provider: ethers.providers.Provider,
    address: string,
    _db?: DB
) => {
    const unirepContract = getUnirepContract(address, provider)
    let db: DB = _db ?? (await SQLiteConnector.create(schema, ':memory:'))
    const userState = new UserState(
        db,
        defaultProver,
        unirepContract,
        new ZkIdentity()
    )
    await userState.start()
    await userState.waitForSync()
    return userState
}

export { exec }
