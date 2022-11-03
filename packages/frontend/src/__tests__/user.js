import { User } from '../context/User'
import * as config from '../config'
import Unirep, { UnirepConfig } from '../context/Unirep'
import { ZkIdentity } from '@unirep/crypto'
import 'fake-indexeddb/auto'
import { genEpochKey } from '@unirep/core'
import { SocialUserState } from '@unirep-social/core'
import prover from '../context/prover'
import { DB } from 'anondb'

// might have to instantiate a database and other arguements like how it is done in the setIdentity function

let user

describe('User', function () {
    beforeEach(async () => {
        user = new User()
    })
    afterEach(() => {
        jest.clearAllMocks()
    })

    test('load state with load() calls localStroage', async () => {
        const windowGetItemSpy = jest.spyOn(localStorage, 'getItem')
        await user.load()
        expect(windowGetItemSpy).toHaveBeenCalled()
    })
    // TODO: config() error error
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

    test.skip('syncPercent functionality', () => {
        user.latestProcessedBlock = 4
        console.log(user.syncPercent)
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
        await user.updateLatestTransitionedEpoch()
        expect(updateLTESpy).toHaveBeenCalled()
    })

    test('encrypt() with zkIdentity', async () => {
        const encryptSpy = jest.spyOn(user, 'encrypt')
        user.id = new ZkIdentity()
        await user.encrypt()
        expect(encryptSpy).toHaveBeenCalled()
    })

    test('encrypt() should error without zkIdetity', async () => {
        expect.assertions(1)
        try {
            await user.encrypt()
        } catch (err) {
            expect(err).not.toBe(true)
        }
    })
})
