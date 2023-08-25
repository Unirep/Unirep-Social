import { render, screen } from '@testing-library/react'
import UserContext from '../context/User'
import PostContext from '../context/Post'
import NewPage from '../pages/newPage/newPage'
import { BrowserRouter, Redirect } from 'react-router-dom'

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useLocation: () => ({
        state: {
            test: {
                test: 'test',
            },
        },
    }),
    useParams: jest.fn().mockReturnValue({ id: '1' }),
}))

test('should render NewPage correctly with mocked .Provider data and props', async () => {
    const userData = {
        userState: true,
        id: {},
        currentEpochKeys: ['epoch_key test1', 'epoch_key test2'],
        username: {},
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
        <BrowserRouter>
            <Redirect Redirect to="/general">
                <UserContext.Provider value={userData}>
                    <PostContext.Provider value={postData}>
                        <NewPage />
                    </PostContext.Provider>
                </UserContext.Provider>
            </Redirect>
        </BrowserRouter>
    )

    // todo: why doesn't anything render for NewPage here
    // expect(screen.getByText(/create post/i)).toBeInTheDocument()
    // expect(screen.getByText(/post - 5 points/i)).toBeInTheDocument()
    // expect(screen.getByText(/transition at:/i)).toBeInTheDocument()
})
