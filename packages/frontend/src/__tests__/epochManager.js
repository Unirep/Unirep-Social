import { EpochManager } from '../context/EpochManager'
import { UnirepConfig } from '../context/Unirep'
import { User } from '../context/User'
import { ethers } from 'ethers'

describe('EpochManager', function () {
    test('call updateWatch() to test private methods', async () => {
        // instantiate classes
        const epochmanager = new EpochManager()
        const unirepconfig = new UnirepConfig()
        const user = new User()
        // load
        unirepconfig.load()
        user.load()
        // Spies
        const updateWatchSpy = jest.spyOn(epochmanager, 'updateWatch')
        const loadCurrentEpochSpy = jest.spyOn(user, 'loadCurrentEpoch')

        const updateWatch = await epochmanager.updateWatch()

        expect(epochmanager.timer).toEqual(790)
        expect(epochmanager.currentEpoch._hex).toBe('0x01')
        expect(epochmanager.nextTransition).toEqual(2000)
        expect(epochmanager.readyToTransition).toBe(false)
        expect(typeof epochmanager.updateWatch).toBe('function')

        // assert on spies
        expect(updateWatchSpy).toHaveBeenCalled()
        expect(loadCurrentEpochSpy).toHaveBeenCalled()
    })
})
