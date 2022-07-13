import React from 'react'
import { screen, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ShareBox from '../components/shareBox/shareBox'

const closeBoxMock = jest.fn()

test('render proper text to the screen', () => {
    render(<ShareBox />)
    expect(screen.getByText(/share this post/i)).toBeInTheDocument()
    expect(screen.getByText(/copy link/i)).toBeInTheDocument()
})

test('ShareBox component renders props properly', () => {
    render(<ShareBox url="url" closeBox={closeBoxMock} />)
    screen.debug()
    expect(screen.getByText(/url/i)).toBeInTheDocument()

    waitFor(userEvent.click(screen.getByText(/url/i)))
    // expect(closeBoxMock).toHaveBeenCalled()
    screen.debug()
})