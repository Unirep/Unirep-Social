import { User } from '../context/User'
import * as config from '../config'
import Unirep, { UnirepConfig } from '../context/Unirep'
import { ZkIdentity } from '@unirep/crypto'
import 'fake-indexeddb/auto'
import { generateTestingUtils } from 'eth-testing'

let user

const testingUtils = generateTestingUtils({
    providerType: config.DEFAULT_ETH_PROVIDER,
})
const unirepTestingUtils = testingUtils.generateContractUtils(config.UNIREP_ABI)

describe('User', function () {
    beforeAll(() => {
        global.window.ethereum = testingUtils.getProvider()
    })
    beforeEach(async () => {
        user = new User()
    })
    afterEach(() => {
        jest.clearAllMocks()
        testingUtils.clearAllMocks()
    })

    test('load state with load()', async () => {
        const windowGetItemSpy = jest.spyOn(localStorage, 'getItem')
        await user.load()
        expect(windowGetItemSpy).toHaveBeenCalled()
    })

    test('save() calls setItem on localStorage', async () => {
        const windowSetItemSpy = jest.spyOn(localStorage, 'setItem')
        // no identity set, so will not be called
        user.save()
        expect(windowSetItemSpy).not.toHaveBeenCalled()
        // now create identity and then call save()
        user.id = new ZkIdentity()
        unirepTestingUtils.mockCall(
            'config',
            [
                0, // globalStateTreeDepth
                0, // userStateTreeDepth
                0, // epochTreeDepth
                10, // numEpochKeyNoncePerEpoch
                10, // maxReputationBudget
                10, // numAttestationsPerProof
                10, // epochLength
                10, // attestingFee
                10, // maxUsers
                10, // maxAttesters
            ],
            undefined,
            { persistent: true }
        )
        user.save()
        expect(windowSetItemSpy).toHaveBeenCalled()
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
