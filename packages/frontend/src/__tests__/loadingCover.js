import React from 'react'
import { screen, render, rerender } from '@testing-library/react'
import LoadingCover from '../components/loadingCover/loadingCover'

test('should render the appropriate text content ', () => {
    render(<LoadingCover />)
    screen.debug()
    expect(
        screen.getByText(/generating your weekly persona/i)
    ).toBeInTheDocument()
    expect(
        screen.getByText(
            /this process will take about 20 seconds. please do not close this window while in progress./i
        )
    ).toBeInTheDocument()
    expect(
        screen.getByText(
            /uniRep is built with care, care comes with patience./i
        )
    ).toBeInTheDocument()
})
