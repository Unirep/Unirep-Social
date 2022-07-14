import { render, screen, getByRole, waitFor } from '@testing-library/react'
import AppRouter from '../router'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'

// Is there a better solution to teh fetch error than this?:  https://github.com/facebook/jest/issues/10784#:~:text=NODE_OPTIONS%3D%2D%2Dunhandled%2Drejections%3Dwarn%20yarn%20test

// mock needed for history and location hooks
const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({
        push: mockHistoryPush,
    }),
    useLocation: () => ({
        state: {
            test: {
                test: "test",
            }
        }
    })
}));


test('AppRouter component renders correct text', () => {
    render(<AppRouter />)
    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
    expect(
        screen.getByText(/community built on ideas, not identities/i)
    ).toBeInTheDocument()
    expect(
        screen.getByText(/stay up to date & share everything with everyone./i)
    ).toBeInTheDocument()
    expect(screen.getByText(/join us/i)).toBeInTheDocument()
    expect(
        screen.getByText(/you must join or login to create post/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/new/i)).toBeInTheDocument()
    expect(screen.getByText(/boost/i)).toBeInTheDocument()
    expect(screen.getByText(/comments/i)).toBeInTheDocument()
    expect(screen.getByText(/squash/i)).toBeInTheDocument()
    expect(screen.getByText(/it's empty here./i)).toBeInTheDocument()
    expect(
        screen.getByText(/people just being shy, no post yet./i)
    ).toBeInTheDocument()
    expect(screen.getByText(/FAQ/i)).toBeInTheDocument()
    expect(screen.getByText(/about/i)).toBeInTheDocument()
    expect(screen.getByText(/send feedback/i)).toBeInTheDocument()
    expect(screen.getByText(/back to top/i)).toBeInTheDocument()
    expect(screen.getByText(/all done./i)).toBeInTheDocument()
    expect(screen.getByText(/detail/i)).toBeInTheDocument()
})

// using createMemoryHistory is no longer recommended
// instead, use window.history.pushState({}, 'page', '/') to update url to intended route
// then render the regular router with BrowserRouter
test('AppRouter should navigate to /signup', async () => {
    window.history.pushState({}, '', '/signup')
    render(
        <BrowserRouter>
            <AppRouter />
        </BrowserRouter>
    )

    expect(screen.getByText(/join us/i)).toBeInTheDocument()
    expect(screen.getByText(/request here/i)).toBeInTheDocument()
})

test('AppRouter should navigate to /login', () => {
    window.history.pushState({}, '', '/login')
    render(
        <BrowserRouter>
            <AppRouter />
        </BrowserRouter>
    )
    expect(
        screen.getByText(
            /To enter the app, please use the private key you got when you signed up./i
        )
    ).toBeInTheDocument()
})

test('AppRouter should navigate to /user ', () => {
    window.history.pushState({}, '', '/user')
    render(
        <BrowserRouter>
            <AppRouter />
        </BrowserRouter>
    )
})

test('AppRouter should navigate to /post ', () => {
    window.history.pushState({}, '', '/post')
    render(
        <BrowserRouter>
            <AppRouter />
        </BrowserRouter>
    )
})

test('AppRouter should navigate to /admin', () => {
    window.history.pushState({}, '', '/admin')
    render(
        <BrowserRouter>
            <AppRouter />
        </BrowserRouter>
    )
    expect(screen.getByRole('heading', {
        name: /admin login/i
      })).toBeInTheDocument()
})

test('AppRouter should navigate to /new', () => {
    window.history.pushState({}, '', '/new')
    render(
        <BrowserRouter>
            <AppRouter />
        </BrowserRouter>
    )
})

test('AppRouter should navigate to /setting', () => {
    window.history.pushState({}, '', '/setting')
    render(
        <BrowserRouter>
            <AppRouter />
        </BrowserRouter>
    )
})

test('AppRouter should be redirected if navigating to route that does not exist', () => {
    window.history.pushState({}, '', '/loremipsum')
    render(
        <BrowserRouter>
            <AppRouter />
        </BrowserRouter>
    )
    // checks if we are redirected to the home page
    expect(screen.getByText(/You must join or login to create post/i)).toBeInTheDocument()
})