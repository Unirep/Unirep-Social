import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserContext from '../context/User'
import PostContext from '../context/Post'
import CommentBlock from '../components/postBlock/commentBlock'

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
                <CommentBlock commentId={commentId} page={page}></CommentBlock>
            </PostContext.Provider>
        </UserContext.Provider>
    )
}

test('should render CommentBlock correctly with provider data', () => {
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
    expect(screen.getByText(/epoch_key test/i)).toBeInTheDocument()
    expect(screen.getByText(/etherscan/i)).toBeInTheDocument()
    expect(screen.getByText(/content from commentsById/i)).toBeInTheDocument()
    expect(screen.getByText(/boost/i)).toBeInTheDocument()
    expect(screen.getByText(/squash/i)).toBeInTheDocument()
    expect(screen.getByText(/share/i)).toBeInTheDocument()
})

test('should simulate user triggering gotoPost function on user route', async () => {
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
    const gotoPost = document.getElementsByClassName(
        'block-content no-padding-horizontal'
    )[0]
    // this will trigger the gotoPost function
    await userEvent.click(gotoPost)
})
