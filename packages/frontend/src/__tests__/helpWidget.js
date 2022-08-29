import { screen, render, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HelpWidget from '../components/helpWidget'

test('helpWidget conditionally renders to the page on click', async () => {
    const epk4Post = 'Select a persona to post this'
    render(<HelpWidget type={epk4Post} />)
    const imageElement = screen.getByRole('img')
    fireEvent.mouseEnter(imageElement)

    expect(
        screen.getByText(/select a persona to post this/i)
    ).toBeInTheDocument()
})
