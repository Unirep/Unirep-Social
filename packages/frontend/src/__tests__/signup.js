import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Signup from '../pages/startPage/signup'

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

const renderSignup = (onboarded, getStarted) => {
    render(<Signup onboarded={onboarded} getStarted={getStarted} />)
}

test('should render signup text correctly', () => {
    const oboarded = jest.fn()
    const getStarted = jest.fn()
    const title = 'Sign up'
    const oauth =
        'UniRep Social uses OAuth authentication. You can sign up easily while maintaining your anonymity.'
    const note =
        "We don't store your user information, we use it to generate a proof that you have an identity."
    renderSignup(oboarded, getStarted)
    expect(
        screen.getByText('Sign up') &&
            screen.getByText(title) &&
            screen.getByText(oauth) &&
            screen.getByText('Twitter') &&
            screen.getByText('Github') &&
            screen.getByText(note)
    )
})

test('should simulate twitter signup', () => {
    const oboarded = jest.fn()
    const getStarted = jest.fn()
    renderSignup(oboarded, getStarted)
    const twitterButton = screen.getByText('Twitter')
    return userEvent
        .click(twitterButton)
        .then(() => expect(location.replace).toHaveBeenCalled())
})

test('should simulate github signup', () => {
    const oboarded = jest.fn()
    const getStarted = jest.fn()
    renderSignup(oboarded, getStarted)
    const githubButton = screen.getByText('Github')
    return userEvent
        .click(githubButton)
        .then(() => expect(location.replace).toHaveBeenCalled())
})
