import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RefreshReminder from '../components/refreshReminder'

import UserContext from '../context/User'
import QueueContext, { Metadata, ActionType } from '../context/Queue'
import EpochContext from '../context/EpochManager'

const renderRefreshReminder = (userData, queueData, epochData) => {
    render(
        <UserContext.Provider value={userData}>
            <QueueContext.Provider value={queueData}>
                <EpochContext.Provider value={epochData}>
                    <RefreshReminder />
                </EpochContext.Provider>
            </QueueContext.Provider>
        </UserContext.Provider>
    )
}

test('trigger button onClick functionality', async () => {
    const queueData = {
        addOp: jest.fn(),
        afterTx: jest.fn(),
    }
    const userData = {
        // userStateTransition: jest.fn(),
        calculateAllEpks: jest.fn(),
        loadReputation: jest.fn(),
        updateWatch: jest.fn(),
        updateLatestTransitionEpoch: jest.fn(),
    }

    const epochData = {
        updateWatch: jest.fn(),
    }

    renderRefreshReminder(userData, queueData, epochData)
    const button = screen.getByText('Refresh')
    button.click()
    // assert functions were called after triggering button click
    expect(queueData.addOp).toHaveBeenCalled()
})
