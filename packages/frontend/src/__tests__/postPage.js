import { render, screen } from '@testing-library/react'
import PostContext from '../context/Post'
import UserContext from '../context/User'
import PostPage from '../pages/postPage/postPage'

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useParams: jest.fn().mockReturnValue({ id: '1' }),
}))

const renderPostPage = (userData, postData, postId, page) => {
    render(
        <UserContext.Provider value={userData}>
            <PostContext.Provider value={postData}>
                <PostPage postId={postId} page={page} />
            </PostContext.Provider>
        </UserContext.Provider>
    )
}

test('should render PostPage with mocked post data and props', () => {
    const userData = {
        userState: true,
        netReputation: 30,
        commentReputation: 30,
        currentEpochKeys: ['epoch_key test1', 'epoch_key test2'],
    }

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
    renderPostPage(userData, postData, '1', '/home')
    expect(screen.getAllByText(/mocked post content/i)).toBeTruthy()
    expect(screen.getByText(/some comment draft content/i)).toBeInTheDocument()
    // todo: fix error being thrown from TextEditor component
})
