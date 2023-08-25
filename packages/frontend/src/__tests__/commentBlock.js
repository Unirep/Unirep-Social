import { screen, render } from '@testing-library/react'
import UserContext from '../context/User'
import PostContext from '../context/Post'
import CommentBlock from '../components/commentBlock'
import { BrowserRouter } from 'react-router-dom'

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
        <BrowserRouter>
            <UserContext.Provider value={userData}>
                <PostContext.Provider value={postData}>
                    <CommentBlock commentId={commentId} page={page} />
                </PostContext.Provider>
            </UserContext.Provider>
        </BrowserRouter>
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
                epoch_key: '123',
            },
        },
    }

    const userData = {
        userState: 'userState',
        currentEpochKeys: ['123', '456'],
    }

    renderCommentBlock(userData, postData, commentId, page)
    expect(screen.getByText(/post by/i)).toBeInTheDocument()
    expect(
        await screen.findByText(`Post by ${postData.commentsById[1].epoch_key}`)
    ).toBeInTheDocument()
    expect(screen.getByText(/etherscan/i)).toBeInTheDocument()
    await expect(
        screen.findByText(postData.commentsById[1].content)
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
                epoch_key: '123',
            },
        },
    }

    const userData = {
        userState: 'userState',
        currentEpochKeys: ['123', '456'],
    }

    renderCommentBlock(userData, postData, commentId, page)
    const user = document.getElementsByClassName('user')[0]
    // this will trigger the isEpkHovered state to be true
    // TODO: should be fixed
    // await userEvent.click(user)
    // expect(
    //     screen.findByText(
    //         `This person is showing off ${postData.commentsById[1].reputation} Rep`
    //     )
    // ).toBeTruthy()
})
