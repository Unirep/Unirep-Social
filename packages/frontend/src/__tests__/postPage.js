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

test('should render PostPage with mocked post data', () => {
    const postData = {
        postsById: {
            1: {
                current_epoch: 7,
                content: 'mocked post content',
                createdAt: parseInt('00'),
            },
        },
        commentsById: {
            1: {
                current_epoch: 7,
                content: 'mocked post content',
                createdAt: parseInt('00'),
            },
        },
        votesByPostId: {
            1: ['1'],
        },
        commentsByPostId: {
            1: ['1'],
        },
        commentDraft: {
            content: 'some comment draft content',
        },
        loadVotesForPostId: jest.fn(),
        loadVotesForCommentId: jest.fn(),
        loadPost: jest.fn(),
        loadCommentsByPostId: jest.fn(),
    }
    renderPostPage(postData)

    expect(
        screen.getByText(/community built on ideas, not identities/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/loading.../i)).toBeInTheDocument()
})

test('should render PostPage with mocked post data', () => {
    const postData = {
        postsById: {
            1: {
                current_epoch: 7,
                content: 'mocked post content',
                createdAt: parseInt('00'),
            },
        },
        commentsById: {
            1: {
                current_epoch: 7,
                content: 'mocked post content',
                createdAt: parseInt('00'),
            },
        },
        votesByPostId: {
            1: ['1'],
        },
        commentsByPostId: {
            1: ['1'],
        },
        commentDraft: {
            content: 'some comment draft content',
        },
        loadVotesForPostId: jest.fn(),
        loadVotesForCommentId: jest.fn(),
        loadPost: jest.fn(),
        loadCommentsByPostId: jest.fn(),
    }
    renderPostPage(postData)

    expect(
        screen.getByText(/community built on ideas, not identities/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/loading.../i)).toBeInTheDocument()
})
