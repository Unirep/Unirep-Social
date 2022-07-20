import React from 'react'
import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CommentBlock from '../components/postBlock/commentBlock'
import PostContext from '../../src/context/Post'

// jest.mock('../../src/context/Post')

// mocked props
const commentId = 'commentId'
const page = '/user'

// mocked data for provider
const mockData = {
    commentsById: {
        commentId: 'string',
    },
}

test.skip('should render CommentBlock correctly with props', () => {
    render(
        <PostContext.Provider value={mockData}>
            <CommentBlock commentId={commentId} page={page} />
        </PostContext.Provider>
    )
    screen.debug()
})
