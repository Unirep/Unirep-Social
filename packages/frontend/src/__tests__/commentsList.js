import { screen, render, waitFor } from '@testing-library/react'
import CommentsList from '../components/postsList/commentsList'

// mocked props
const commentIds = ['1', '2', '3']
const page = '/post'
const mockLoadMoreComments = jest.fn()

test('should render CommentLists correctly *without* comments', () => {
    render(
        <CommentsList
            commentIds={0}
            page={page}
            loadMoreComments={mockLoadMoreComments}
        />
    )
    expect(screen.getByText(/it's empty here./i)).toBeInTheDocument()
    expect(
        screen.getByText(/people just being shy, no post yet./i)
    ).toBeInTheDocument()
    expect(screen.queryByText(/load more posts/i)).not.toBeInTheDocument()
})

test.skip('should render CommentLists commentBlocks with commentIds array > 0', () => {
    render(
        <CommentsList
            commentIds={commentIds}
            page={page}
            loadMoreComments={mockLoadMoreComments}
        />
    )
    expect(screen.getByText(/it's empty here./i)).toBeInTheDocument()
    expect(
        screen.getByText(/people just being shy, no post yet./i)
    ).toBeInTheDocument()
    expect(screen.queryByText(/load more posts/i)).not.toBeInTheDocument()
})
