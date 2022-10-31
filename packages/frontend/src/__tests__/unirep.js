import { UnirepConfig } from '../context/Unirep'
import { ethers } from 'ethers'
import {
    SERVER,
    UNIREP_SOCIAL_ABI,
    UNIREP_ABI,
    DEFAULT_ETH_PROVIDER,
} from '../config'

afterEach(() => {
    jest.restoreAllMocks()
})

describe('Unirep Config', function () {
    const unirepconfig = new UnirepConfig()

    test('defines load()', () => {
        expect(typeof unirepconfig.load).toBe('function')
    })

    test('load() is called with no arguments and populates state', async () => {
        const loadSpy = jest.spyOn(unirepconfig, 'load')
        //call load function
        await unirepconfig.load()

        expect(loadSpy).toHaveBeenCalled()
        expect(unirepconfig.loaded).toBe(true)

        expect(unirepconfig.unirepAddress).toBe(
            '0x0000000000000000000000000000000000000000'
        )
        expect(unirepconfig.unirepSocialAddress).toBe(
            '0x0000000000000000000000000000000000000000'
        )
        expect(unirepconfig.globalStateTreeDepth).toEqual(1)
        expect(unirepconfig.userStateTreeDepth).toEqual(1)
        expect(unirepconfig.epochTreeDepth).toEqual(1)
        expect(unirepconfig.attestingFee).toEqual(1)
        expect(unirepconfig.numEpochKeyNoncePerEpoch).toEqual(1)
        expect(unirepconfig.numAttestationsPerEpochKey).toEqual(6)
        expect(unirepconfig.epochLength).toEqual(1)
        expect(unirepconfig.maxReputationBudget).toEqual(1)
        expect(unirepconfig.maxUsers).toEqual(1)
        expect(unirepconfig.postReputation).toEqual(1)
        expect(unirepconfig.commentReputation).toEqual(1)
        expect(unirepconfig.attesterId).toEqual(1)
    })

    test('nextEpochTime() gets last transition', async () => {
        const nextEpochTimeSpy = jest.spyOn(unirepconfig, 'nextEpochTime')

        const nextEpochTime = await unirepconfig.nextEpochTime()
        expect(nextEpochTimeSpy).toHaveBeenCalled()
        expect(nextEpochTime).toEqual(2000)
    })

    test('currentEpoch() method', async () => {
        const currentEpochSpy = jest.spyOn(unirepconfig, 'currentEpoch')

        const currentEpoch = await unirepconfig.currentEpoch()
        expect(currentEpoch._hex).toBe('0x01')
        expect(currentEpochSpy).toHaveBeenCalled()
    })
})
