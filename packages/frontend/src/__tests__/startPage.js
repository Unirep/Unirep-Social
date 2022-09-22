import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StartPage from '../pages/startPage/startPage'

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

test('should render the startPage properly', () => {
    const p1 =
        'Great to have you here. Currently, UniRep Social is an experimental & research use dApp. We are part of the Privacy & Scaling Explorations team that specializes in zero-knowledge proof and advanced blockchain technology.'
    const p2 =
        'Our mission is to empower the general public to have full privacy under the social media setup, while earning the reputation they deserved. It’s tricky, but yes, we know it’s very important.'
    const note =
        'If you have previously used UniRep, you might need to re-sign up again, since we have change the network.'
    render(<StartPage />)
    expect(
        screen.getByText(p1) &&
            screen.getByText(p2) &&
            screen.getByText(note) &&
            screen.getByText('Sign In') &&
            screen.getByText('Sign Up')
    ).toBeInTheDocument()
})
