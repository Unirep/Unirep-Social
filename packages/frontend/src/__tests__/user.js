import { User } from '../context/User'
import * as config from '../config'
import { UnirepConfig } from '../context/Unirep'
import { ZkIdentity, Strategy, hash2 } from '@unirep/crypto'

let user

describe('User', function () {
    beforeEach(async () => {
        user = new User()
    })
    afterEach(() => {
        jest.clearAllMocks()
    })

    test('load state with load()', async () => {
        const windowGetItemSpy = jest.spyOn(localStorage, 'getItem')
        await user.load()
        expect(windowGetItemSpy).toHaveBeenCalled()
    })

    test('encrypt() with zkIdentity', async () => {
        user.id = new ZkIdentity()
        await user.encrypt()
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
