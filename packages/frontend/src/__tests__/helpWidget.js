import React from 'react'
import { screen, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HelpWidget from '../components/helpWidget/helpWidget'

// Testing if the HelpWidget conditionally renders based on the isHover boolean state.
test('helpWidget conditionally renders to the page', () => {
    // Arrange
    const epk4Post = 'Select a persona to post this'
    render(<HelpWidget type={epk4Post} />)
    const imageElement = screen.getByRole('img')
    // Act
    // Assert
    waitFor(() =>
        expect(
            screen.getByText(/select a persona to post this/i)
        ).not.toBeInTheDocument()
    )
    userEvent.click(imageElement)
    expect(
        screen.getByText(/select a persona to post this/i)
    ).toBeInTheDocument()
})

// debugging
// screen.debug(), screen.debug(element) AND/OR screen.logTestingPlaygroundURL()
