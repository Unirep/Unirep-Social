import { screen, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingPage from '../pages/settingPage/settingPage'

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({
        push: jest.fn(),
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

test('should render SettingPage properly with BasicPage and PrivateKey components', () => {
    render(<SettingPage />)

    expect(
        screen.getByText(
            /It seems like you haven’t download your private key yet, please do so soon./i
        )
    ).toBeInTheDocument()
    expect(screen.getByText(/reveal my private key/i)).toBeInTheDocument()
})
