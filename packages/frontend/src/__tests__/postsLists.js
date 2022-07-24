import { screen, render, waitFor } from '@testing-library/react'
import PostsList from '../components/postsList/postsList'

const postIds = ['1', '2', '3']
const mockLoadMorePosts = jest.fn()

test('should render PostsList correctly *without* posts', () => {
    render(<PostsList postIds={0} loadMorePosts={mockLoadMorePosts} />)
    expect(screen.getByText(/it's empty here./i)).toBeInTheDocument()
    expect(
        screen.getByText(/people just being shy, no post yet./i)
    ).toBeInTheDocument()
    expect(screen.queryByText(/load more posts/i)).not.toBeInTheDocument()
})
