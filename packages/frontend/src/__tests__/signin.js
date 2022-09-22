import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Signin from '../pages/startPage/signin'
import UserContext from '../context/User'

const mockHistoryPush = jest.fn()

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({
        push: mockHistoryPush,
    }),
}))

const renderSignin = (userData, getStarted) => {
    render(
        <UserContext.Provider value={userData}>
            <Signin getStarted={getStarted} />
        </UserContext.Provider>
    )
}

test('should render signin text properly', () => {
    const p1 =
        'We have deployed the contract on Optimism, that is different from the previous release. If you have previously used UniRep Social, the private key is no longer valid.'
    const p2 = 'Please paste the newly registered private key below'
    const password = 'Password (Only if you need to decrypt)'
    renderSignin(jest.fn())
    expect(
        screen.getAllByText(/sign in/i) &&
            screen.getByText(p1) &&
            screen.getByText(p2) &&
            screen.getByText(password)
    )
})

test('should simulate user clicking sign in without password', async () => {
    const userData = {
        login: jest.fn(),
    }
    const getStarted = jest.fn()
    renderSignin(userData, getStarted)
    const signinButton = document.getElementById('signin')
    await userEvent.click(signinButton)
    expect(userData.login).toHaveBeenCalled()
})
