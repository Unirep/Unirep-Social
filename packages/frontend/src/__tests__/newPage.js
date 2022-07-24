import { render, screen } from '@testing-library/react'
import UserContext from '../context/User'
import PostContext from '../context/Post'
import NewPage from '../pages/newPage/newPage'

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useLocation: () => ({
        state: {
            test: {
                test: 'test',
            },
        },
    }),
}))

test('should render NewPage correctly with mocked .Provider data and props', async () => {
    const userData = {
        userState: true,
        currentEpochKeys: ['epoch_key test1', 'epoch_key test2'],
    }

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
        setDraft: jest.fn(),
    }

    render(
        <UserContext.Provider value={userData}>
            <PostContext.Provider value={postData}>
                <NewPage />
            </PostContext.Provider>
        </UserContext.Provider>
    )
    expect(screen.getByText(/create post/i)).toBeInTheDocument()
    expect(screen.getByText(/post - 5 points/i)).toBeInTheDocument()
    expect(screen.getByText(/transition at:/i)).toBeInTheDocument()
})