import {
    render,
    screen,
    getByRole,
    waitFor,
} from '@testing-library/react'
import AppRouter from '../router'
import userEvent from '@testing-library/user-event'
import {BrowserRouter, MemoryRouter} from 'react-router-dom'

// Is there a better solution to teh fetch error than this?:  https://github.com/facebook/jest/issues/10784#:~:text=NODE_OPTIONS%3D%2D%2Dunhandled%2Drejections%3Dwarn%20yarn%20test

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
    // instead, use window.history.pushState({}, 'page', '/') to update url to route
    // then render the regular router with BrowserRouter
test('AppRouter should navigate to page', () => {
    render(
        <BrowserRouter>
            <AppRouter />
        </BrowserRouter>
    )
    window.history.pushState({}, '', '/signin')
    screen.debug()
})
