import { screen, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingPage from '../pages/settingPage'

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
            /uniRep social uses semaphore technology to generate the private key. it's a super dope string and it's very important for you to store it safely. this key will be used to regain access to your rep points./i
        )
    ).toBeInTheDocument()
    expect(screen.queryByText(/private key./i)).toBeInTheDocument()
})
