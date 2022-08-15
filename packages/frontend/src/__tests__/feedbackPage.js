import { render } from '@testing-library/react'
import FeedbackPage from '../pages/feedbackPage'

test('should render FeedbackPage with iframe tag', () => {
    render(<FeedbackPage />)
    const iframe = document.getElementsByClassName('airtable-embed')
    expect(iframe).toBeTruthy()
})
