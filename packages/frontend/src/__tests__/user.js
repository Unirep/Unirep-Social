import { User } from '../context/User'
import * as config from '../config'
import Unirep, { UnirepConfig } from '../context/Unirep'
import { ZkIdentity } from '@unirep/crypto'
import 'fake-indexeddb/auto'
import { genEpochKey } from '@unirep/core'
import { SocialUserState } from '@unirep-social/core'
import prover from '../context/prover'
import { DB } from 'anondb'

let user

describe('User', function () {
    beforeEach(async () => {
        user = new User()
        // user.userState = new SocialUserState(
        //     DB,
        //     prover,
        //     user.unirepConfig.unirep,
        //     user.id
        // )
    })
    afterEach(() => {
        jest.clearAllMocks()
    })

    test('load state with load() calls localStroage', async () => {
        const windowGetItemSpy = jest.spyOn(localStorage, 'getItem')
        await user.load()
        expect(windowGetItemSpy).toHaveBeenCalled()
    })
    // TODO: config() error here
    test.skip('save() calls setItem on localStorage', async () => {
        const windowSetItemSpy = jest.spyOn(localStorage, 'setItem')
        // no identity set, so will not be called
        user.save()
        expect(windowSetItemSpy).not.toHaveBeenCalled()
        // now create identity, and then call save()
        user.id = new ZkIdentity()
        user.save()
        expect(windowSetItemSpy).toHaveBeenCalled()
    })

    test('loadCurrentEpoch() returns currentEpoch', async () => {
        const currentEpoch = await user.loadCurrentEpoch()
        expect(currentEpoch).toEqual(1)
    })

    test('currentEpochKeys returns Array of EpochKeys', () => {
        // throw error without Id set
        expect(() => user.currentEpochKeys).toThrowError('No id set')
        // now set identity
        user.id = new ZkIdentity()
        const value = user.currentEpochKeys
        expect(value).not.toBeUndefined()
    })

    test('identity functionality', () => {
        // no identity set
        expect(user.identity).toBeUndefined()
        // now set identity
        user.id = new ZkIdentity()
        const value = user.identity
        // value generates identity
        expect(typeof value).toBe('string')
    })

    test('syncPercent functionality', () => {
        // error case
        user.latestProcessedBlock = false
        expect(user.syncPercent).toEqual(0)
        // set values
        user.latestProcessedBlock = 1000
        user.initialSyncFinalBlock = 400
        user.syncStartBlock = 1
        const value = user.syncPercent
        expect(Math.floor(value)).toEqual(250)
    })

    test.skip('startSync() functionality', async () => {
        user.startSync('string')
    })

    test('setIdentity() functionality initializes user state', async () => {
        await user.setIdentity(new ZkIdentity())
        // user state
        expect(typeof user.userState).toBe('object')
        // check if database was created
        expect(typeof user.userState._db).toBe('object')
    })

    test('updateLatestTransitionedEpoch() functionality is triggered', async () => {
        const updateLTESpy = jest.spyOn(user, 'updateLatestTransitionedEpoch')
        user.latestTransitionedEpoch = 40
        const value = await user.updateLatestTransitionedEpoch()
        expect(updateLTESpy).toHaveBeenCalled()
    })

    test('encrypt() with zkIdentity', async () => {
        const encryptSpy = jest.spyOn(user, 'encrypt')
        user.id = new ZkIdentity()
        await user.encrypt()
        expect(encryptSpy).toHaveBeenCalled()
    })

    test('encrypt() should error without zkIdentity', async () => {
        expect.assertions(1)
        try {
            await user.encrypt()
        } catch (err) {
            expect(err).not.toBe(true)
        }
    })
})
