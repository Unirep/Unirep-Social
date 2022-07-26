import React from 'react'
import { screen, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ShareBox from '../components/shareBox/shareBox'

const closeBoxMock = jest.fn()

test('render proper text to the screen', async () => {
    render(<ShareBox />)
    expect(screen.getByText(/share this post/i)).toBeInTheDocument()
    expect(screen.getByText(/copy link/i)).toBeInTheDocument()
})

test('ShareBox component renders props properly', async () => {
    render(<ShareBox url="url" closeBox={closeBoxMock} />)
    expect(screen.getByText(/url/i)).toBeInTheDocument()

    await waitFor(() => userEvent.click(screen.getByText(/url/i)))
    expect(screen.getByText(/copy link/i)).toBeInTheDocument()
})
