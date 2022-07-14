import { render, screen } from '@testing-library/react'
import FeedbackPage from '../pages/feedbackPage/feedbackPage'

test('should render FeedbackPage', () => {
    render(<FeedbackPage />)
    const iframe = document.getElementsByClassName('airtable-embed')
    expect(iframe).toBeTruthy()
})
