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
            /It seems like you haven’t downloaded your private key yet, please do so soon./i
        )
    ).toBeInTheDocument()
    expect(screen.getByText(/reveal my private key/i)).toBeInTheDocument()
})

test('should trigger Private Key onClick Event', async () => {
    render(<SettingPage />)
    const privateKeyButton = screen.getByText('Private Key')
    await privateKeyButton.click()
    expect(privateKeyButton).toHaveClass('setting-nav chosen')
    const userNameButton = screen.getByText('User Name')
    await userNameButton.click()
    expect(userNameButton).toHaveClass('setting-nav chosen')
})
