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
        '👋​ Great to have you here, Please select one of following to start. We only use your social ID to generate an identity proof, you are fully anonymous here.'
    const note =
        'If you have previously used UniRep, you might need to re-sign up again, since we have change the network.'
    render(<StartPage />)
    expect(
        screen.getByText(p1) &&
            screen.getByText(note) &&
            screen.getByText('Sign In') &&
            screen.getByText('Sign up with Twitter') &&
            screen.getByText('Sign up with Github')
    ).toBeInTheDocument()
})
