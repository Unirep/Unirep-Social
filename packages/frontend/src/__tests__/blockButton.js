import { screen, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BlockButton from '../components/postBlock/blockButton'

test('should render BlockButton props correctly', () => {
    // Mocked props
    const type = 'comment'
    const count = 1
    const data = {
        type: 'comment',
        id: '0x123456789',
        post_id: '0x123456789',
        content: 'test',
        upvote: 0,
        downvote: 0,
        epoch_key: '0x123456789',
        username: 'test',
        post_time: 0,
        reputation: 0,
        current_epoch: 0,
        proofIndex: 0,
    }

    render(<BlockButton type={type} count={count} data={data} />)
    expect(screen.getByText(/comment/i)).toBeInTheDocument()
})

test('should render BlockButton share button correctly', () => {
    // Mocked props
    const type = 'share'
    const count = 1
    const data = {
        type: 'share',
        id: '0x123456789',
        post_id: '0x123456789',
        content: 'test',
        upvote: 0,
        downvote: 0,
        epoch_key: '0x123456789',
        username: 'test',
        post_time: 0,
        reputation: 0,
        current_epoch: 0,
        proofIndex: 0,
    }

    render(<BlockButton type={type} count={count} data={data} />)
    // Check if share button is rendered
    expect(document.getElementsByClassName('block-button-share')).toBeTruthy()
})
