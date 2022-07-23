import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserContext from '../context/User'
import LoginPage from '../pages/loginPage/loginPage'

// import { rest } from 'msw'
// import { setupServer } from 'msw/node'

// const server = setupServer(
//     rest.get('/', (req, res, ctx) => {
//         return res(
//             ctx.json({
//                 test: 'test',
//             })
//         )
//     })
// )

// beforeAll(() => {
//     // Establish requests interception layer before all tests.
//     server.listen()
// })

// afterAll(() => {
//     // Clean up after all tests are done, preventing this
//     // interception layer from affecting irrelevant tests.
//     server.close()
//   })

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



test('LoginPage should handle events properly', async () => {
    render(<LoginPage />)
    const textbox = screen.getByRole(/textbox/i)
    await userEvent.type(textbox, 'test')
    
})
