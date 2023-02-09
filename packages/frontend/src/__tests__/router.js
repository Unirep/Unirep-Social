import { render, screen } from '@testing-library/react'
import AppRouter from '../router'
import { BrowserRouter } from 'react-router-dom'

// mock needed for history and location hooks
const mockHistoryPush = jest.fn()

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({
        push: mockHistoryPush,
    }),
    useLocation: () => ({
        pathname: '/some/path', // add pathname property
        state: {
            test: {
                test: 'test',
            },
        },
    }),
}))
// abstraced render function
const renderAppRouter = () => {
    return render(
        <BrowserRouter>
            <AppRouter />
        </BrowserRouter>
    )
}

test('AppRouter component renders correct text', () => {
    render(<AppRouter />)
    expect(screen.getByText(/Get started/i)).toBeInTheDocument()
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
    expect(screen.getByText(/all done./i)).toBeInTheDocument()
    expect(screen.getByText(/detail/i)).toBeInTheDocument()
})

// using createMemoryHistory is no longer recommended
// instead, use window.history.pushState({}, 'page', '/') to update url to intended route
// then render the regular router with BrowserRouter

test('AppRouter should navigate to /user ', () => {
    window.history.pushState({}, '', '/user')
    renderAppRouter(<AppRouter />)
})

test('AppRouter should navigate to /post ', () => {
    window.history.pushState({}, '', '/post')
    renderAppRouter(<AppRouter />)
    expect(
        screen.getByText(/you must join or login to create post/i)
    ).toBeInTheDocument()
})

test('AppRouter should navigate to /admin', () => {
    window.history.pushState({}, '', '/admin')
    renderAppRouter(<AppRouter />)
    expect(
        screen.getByRole('heading', {
            name: /admin login/i,
        })
    ).toBeInTheDocument()
})

test('AppRouter should navigate to /new', () => {
    window.history.pushState({}, '', '/new')
    renderAppRouter(<AppRouter />)
})

test('AppRouter should navigate to /setting', () => {
    window.history.pushState({}, '', '/setting')
    renderAppRouter(<AppRouter />)
    expect(
        screen.getByText(
            /It seems like you haven’t downloaded your private key yet, please do so soon./i
        )
    ).toBeInTheDocument()
})

test('AppRouter should be redirected if navigating to route that does not exist', () => {
    window.history.pushState({}, '', '/loremipsum')
    renderAppRouter(<AppRouter />)
    // checks if we are redirected to the home page
    expect(
        screen.getByText(/You must join or login to create post/i)
    ).toBeInTheDocument()
})
