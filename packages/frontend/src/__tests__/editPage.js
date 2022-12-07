import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditPage from '../pages/editPage/editPage'
import { DELETED_CONTENT } from '../config'

import PostContext from '../context/Post'

// mock needed for history and params hooks
const mockHistoryPush = jest.fn()

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({
        push: mockHistoryPush,
        goBack: mockHistoryPush,
    }),
    useParams: jest.fn().mockReturnValue({ id: '1' }),
}))

const renderEditPage = (postData) => {
    return render(
        <PostContext.Provider value={postData}>
            <EditPage />
        </PostContext.Provider>
    )
}

test('intial render testing delete button', async () => {
    const postData = {
        postsById: {
            1: {
                id: 'post id',
                content: 'post content',
                createdAt: new Date().toUTCString(),
                reputation: 30,
                epoch_key: 'epoch_key',
            },
        },
        loadPost: jest.fn(),
        deletePost: jest.fn(),
    }
    renderEditPage(postData)
    expect(
        screen.getAllByText('Update Post') &&
            screen.getByText('post content') &&
            screen.getByText('Delete Post')
    ).toBeInTheDocument()
    const deletePost = screen.getByText('Delete Post')
    await deletePost.click()
    // should render delete post prompt after click
    expect(
        screen.getByText('Are you sure to delete this post?') &&
            screen.getByText('Nevermind.') &&
            screen.getByText('Yes, delete it.')
    ).toBeInTheDocument()
    // Grab delete button in prompt and click it
    const yesDeletePost = screen.getByText('Yes, delete it.')
    await yesDeletePost.click()
})

test('Update button click functionality', async () => {
    const postData = {
        postsById: {
            1: {
                id: 'post id',
                content: 'post content',
                createdAt: new Date().toUTCString(),
                reputation: 30,
                epoch_key: 'epoch_key',
            },
        },
        loadPost: jest.fn(),
        deletePost: jest.fn(),
    }
    renderEditPage(postData)
    expect(
        screen.getAllByText('Update Post') &&
            screen.getByText('post content') &&
            screen.getByText('Delete Post')
    ).toBeInTheDocument()
    const updatePost = screen.queryAllByText('Update Post')[1]
    await updatePost.click()
})

// todo: expect that the useHistory and useParams react hooks are being called
