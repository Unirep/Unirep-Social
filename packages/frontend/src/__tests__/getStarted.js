import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GetStarted from '../pages/startPage/getStarted'

const renderGetStarted = (signin, signup) => {
    render(<GetStarted signin={signin} signup={signup} />)
}

test('should render getting started text', () => {
    const p1 =
        'Great to have you here. Currently, UniRep Social is an experimental & research use dApp. We are part of the Privacy & Scaling Explorations team that specializes in zero-knowledge proof and advanced blockchain technology.'

    const p2 =
        'Our mission is to empower the general public to have full privacy under the social media setup, while earning the reputation they deserved. It’s tricky, but yes, we know it’s very important.'
    const note =
        'If you have previously used UniRep, you might need to re-sign up again, since we have change the network.'

    renderGetStarted(jest.fn(), jest.fn())
    expect(
        screen.getByText(p1) && screen.getByText(p2) && screen.getByText(note)
    ).toBeInTheDocument()
})

test('should be able to click sign in and sign up buttons', async () => {
    const signInMock = jest.fn()
    const signUpMock = jest.fn()
    renderGetStarted(signInMock, signUpMock)
    const signInButton = screen.getByText('Sign In')
    const signUpButton = screen.getByText('Sign Up')
    await userEvent.click(signInButton)
    expect(signInMock.mock.calls.length).toEqual(1)
    await userEvent.click(signUpButton)
    expect(signUpMock.mock.calls.length).toEqual(1)
})
