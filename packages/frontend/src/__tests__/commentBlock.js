import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserContext from '../context/User'
import PostContext from '../context/Post'
import CommentBlock from '../components/commentBlock'

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({
        push: jest.fn(),
    }),
    useLocation: () => ({
        state: {
            test: {
                test: 'test',
            },
        },
    }),
}))

const renderCommentBlock = (userData, postData, commentId, page) => {
    return render(
        <UserContext.Provider value={userData}>
            <PostContext.Provider value={postData}>
                <CommentBlock commentId={commentId} page={page} />
            </PostContext.Provider>
        </UserContext.Provider>
    )
}

test('should render CommentBlock correctly with provider data', async () => {
    const page = '/user'
    const commentId = '1'

    const postData = {
        commentsById: {
            1: {
                id: 'commentId',
                content: 'content from commentsById',
                createdAt: '00',
                reputation: 30,
                epoch_key: 'epoch_key test',
            },
        },
    }

    const userData = {
        userState: 'userState',
        currentEpochKeys: ['user epoch_key test'],
    }

    renderCommentBlock(userData, postData, commentId, page)
    expect(screen.getByText(/post by/i)).toBeInTheDocument()
    expect(
        await screen.findByText(`Post by ${postData.commentsById[1].epoch_key}`)
    ).toBeInTheDocument()
    expect(screen.getByText(/etherscan/i)).toBeInTheDocument()
    expect(
        await screen.findByText(postData.commentsById[1].content)
    ).toBeTruthy()
    expect(screen.getByText(/boost/i)).toBeInTheDocument()
    expect(screen.getByText(/squash/i)).toBeInTheDocument()
    expect(screen.getByText(/share/i)).toBeInTheDocument()
})

test('should render amount of rep user is showing off', async () => {
    const page = '/user'
    const commentId = '1'

    const postData = {
        commentsById: {
            1: {
                id: 'commentId',
                post_id: '1',
                content: 'content from commentsById',
                createdAt: '00',
                reputation: 30,
                epoch_key: 'epoch_key test',
            },
        },
    }

    const userData = {
        userState: 'userState',
        currentEpochKeys: ['user epoch_key test'],
    }

    renderCommentBlock(userData, postData, commentId, page)
    const user = document.getElementsByClassName('user')[0]
    // this will trigger the isEpkHovered state to be true
    await userEvent.click(user)
    expect(
        screen.findByText(
            `This person is showing off ${postData.commentsById[1].reputation} Rep`
        )
    ).toBeTruthy()
})
