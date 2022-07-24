import { screen, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingPage from '../pages/settingPage/settingPage'

const mockHistoryPush = jest.fn()

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({
        push: mockHistoryPush,
    }),
    useLocation: () => ({
        pathname: '/setting',
        state: {
            test: {
                test: 'test',
            },
        },
    }),
}))

test('should render SettingPage properly', () => {
    render(<SettingPage />)
    expect(
        screen.getByText(
            /UniRep Social uses Semaphore technology to generate the private key. It's a super dope string and it's very important for you to store it safely. This key will be used to regain access to your rep points./i
        )
    ).toBeInTheDocument()
})
