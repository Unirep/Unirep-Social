import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditPage from '../pages/editPage/editPage'

import PostContext from '../context/Post'

// mock needed for history and location hooks
const mockHistoryPush = jest.fn()

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({
        push: mockHistoryPush,
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

test('render editPage component', () => {
    const postData = {
        postsById: {
            1: {
                id: 'post id',
                content: 'content from 0102992849301',
                createdAt: new Date().toUTCString(),
                reputation: 30,
                epoch_key: 'epoch_key',
            },
        },
        loadPost: jest.fn(),
        deletePost: jest.fn(),
    }
    renderEditPage(postData)
    screen.debug()
})
