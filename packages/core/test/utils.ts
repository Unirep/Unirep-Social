import { ethers } from 'ethers'
import { Identity } from '@semaphore-protocol/identity'
import { defaultProver } from '@unirep-social/circuits/provers/defaultProver'
import { SocialUserState } from '../src/UserState'
import { DB } from 'anondb/node'
import { Synchronizer } from '@unirep/core'

export const genUnirepState = async (
    provider: ethers.providers.Provider,
    unirepAddress: string,
    unirepSocialAddress: string,
    db?: DB
) => {
    const unirep = new Synchronizer({
        unirepAddress,
        provider,
        attesterId: BigInt(unirepSocialAddress),
        db,
    })
    unirep.pollRate = 150
    await unirep.start()
    await unirep.waitForSync()
    return unirep
}

export const genUserState = async (
    provider: ethers.providers.Provider,
    address: string,
    id: Identity,
    attesterId: string,
    db?: DB
) => {
    const state = new SocialUserState({
        unirepAddress: address,
        provider,
        db,
        id,
        prover: defaultProver,
        unirepSocialAddress: attesterId,
    })
    await state.start()
    await state.waitForSync()
    return state
}
