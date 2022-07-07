import React from 'react'
import { screen, render } from '@testing-library/react'
import LoadingButton from '../components/loadingButton/loadingButton'
import userPage from '../pages/userPage/userPage'

test('loadingButton renders and props render conditionally', () => {
    const { rerender } = render(
        <LoadingButton isLoading={false} name={'string'} />
    )

    expect(screen.getByText(/string/i)).toBeInTheDocument()

    rerender(<LoadingButton isLoading={true} name={'name'} />)
    expect(screen.getByText(/name/i)).toBeInTheDocument()
})
