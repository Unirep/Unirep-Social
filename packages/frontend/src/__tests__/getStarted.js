import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GetStarted from '../pages/startPage/getStarted'

// mock Location API
const location = new URL('https://www.example.com')
location.assign = jest.fn()
location.replace = jest.fn()
location.reload = jest.fn()

delete window.location
window.location = location

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useLocation: () => ({
        state: {
            test: {
                test: 'test',
            },
        },
    }),
}))

const renderGetStarted = (signin) => {
    render(<GetStarted signin={signin} />)
}

test('should render getting started text', () => {
    const p1 =
        '👋​ Great to have you here, Please select one of following to start. We only use your social ID to generate an identity proof, you are fully anonymous here.'
    const note =
        'If you have previously used UniRep, you might need to re-sign up again, since we have change the network.'

    renderGetStarted(jest.fn())
    expect(screen.getByText(p1) && screen.getByText(note)).toBeInTheDocument()
})

test('should simulate twitter signup', async () => {
    renderGetStarted(jest.fn())
    const twitterButton = screen.getByText('Twitter')
    await userEvent.click(twitterButton)
    expect(location.replace).toHaveBeenCalled()
})

test('should simulate github signup', async () => {
    renderGetStarted(jest.fn())
    const githubButton = screen.getByText('Github')
    await userEvent.click(githubButton)
    expect(location.replace).toHaveBeenCalled()
})

test('should be able to click sign in button', async () => {
    const signInMock = jest.fn()
    renderGetStarted(signInMock)
    const signInButton = screen.getByText('Sign In')
    await userEvent.click(signInButton)
    expect(signInMock.mock.calls.length).toEqual(1)
})
