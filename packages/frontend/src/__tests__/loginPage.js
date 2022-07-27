import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '../pages/loginPage/loginPage'

// mock needed for history and location hooks
const mockHistoryPush = jest.fn()

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({
        push: mockHistoryPush,
    }),
}))

test.skip('should render LoginPage correctly', () => {
    render(<LoginPage />)
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument()
    expect(
        screen.getByText(
            /to enter the app, please use the private key you got when you signed up./i
        )
    ).toBeInTheDocument()
    expect(
        screen.getByText(/request an invitation code here./i)
    ).toBeInTheDocument()
    expect(screen.getByText(/got an invitation code/i)).toBeInTheDocument()
    expect(screen.getByText(/join here/i)).toBeInTheDocument()
})

test.skip('ensure hrefs have proper links', () => {
    render(<LoginPage />)
    // checking links render properly
    expect(screen.getByText(/join/i).closest('a')).toHaveAttribute(
        'href',
        '/signup'
    )
    expect(
        screen.getByText(/request an invitation code here./i).closest('a')
    ).toHaveAttribute('href', 'https://about.unirep.social/alpha-invitation')
})

// todo: make sure value is actually in screen.debug() output; value not being shown currently but assertion is passing
test('LoginPage should handle events properly', async () => {
    render(<LoginPage />)
    screen.debug()
    const privateKeyInput = screen.getByPlaceholderText(/enter your private key here/i)
    await userEvent.type(privateKeyInput, 'asdf4saf45saf45sdaf542545')
    expect(privateKeyInput).toHaveValue('asdf4saf45saf45sdaf542545')
    screen.debug(privateKeyInput)
})
