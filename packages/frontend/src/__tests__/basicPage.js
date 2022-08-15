import { render, screen } from '@testing-library/react'
import { WebContext } from '../context/WebContext'
import BasicPage from '../pages/basicPage'

const renderBasicPage = (webData) => {
    return render(
        <WebContext.Provider value={webData}>
            <BasicPage />
        </WebContext.Provider>
    )
}

test('should render BasicPage correctly with false isMenuOpen state from WebContext', () => {
    const webData = {
        isMenuOpen: false,
    }
    renderBasicPage(webData)
    expect(
        screen.getByText(/community built on ideas, not identities/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/send feedback/i)).toBeInTheDocument()
})

test('should render BasicPage correctly true isMenuOpen with Overlay component rendering', () => {
    const webData = {
        isMenuOpen: true,
    }
    renderBasicPage(webData)
    expect(
        screen.getByText(/community built on ideas, not identities/i)
    ).toBeInTheDocument()
    // overlay component rendering based on true isMenuOpen state
    expect(screen.getAllByText(/send feedback/i)[1]).toBeInTheDocument()
    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
})
