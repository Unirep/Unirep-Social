import { render, screen } from '@testing-library/react'
import PostContext from '../context/Post'
import PostPage from '../pages/postPage/postPage'

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useParams: jest.fn().mockReturnValue({ id: '1' }),
}))

const renderPostPage = (postData) => {
    render(
        <PostContext.Provider value={postData}>
            <PostPage />
        </PostContext.Provider>
    )
}

const preDate = new Date()

test.skip('should render properly with mocked data', () => {
    const postData = {
        postsById: {
            1: {
                current_epoch: 7,
                content: 'mocked post content',
            },
        },
        votesByPostId: {
            1: ['1'],
        },
        commentsByPostId: {
            1: ['1'],
        },
        loadVotesForPostId: jest.fn(),
        loadVotesForCommentId: jest.fn(),
        loadPost: jest.fn(),
        createdAt: '00/00/0000 00:00 00', //todo: fix date mocking
    }
    renderPostPage(postData)

    expect(
        screen.getByText(/community built on ideas, not identities/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/loading.../i)).toBeInTheDocument()
})
