import { screen, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserContext from '../context/User'
import PostContext from '../context/Post'
import UserPage from '../pages/userPage/userPage'

const renderUserPage = (userData, postData) => {
    return render(
        <UserContext.Provider value={userData}>
            <PostContext.Provider value={postData}>
                <UserPage />
            </PostContext.Provider>
        </UserContext.Provider>
    )
}

test('should render correctly without UserContext', () => {
    // user.state would be falsy in this case and will return the BasicPage
    render(<UserPage />)
    expect(
        screen.getByText(/community built on ideas, not identities./i)
    ).toBeInTheDocument()
    expect(
        screen.getByText(/stay up to date & share everything with everyone./i)
    ).toBeInTheDocument()
})

test('should render correctly with UserContext and PostContext', () => {

    const userData = {
        userState: true,
        netReputation: 30,
        commentReputation: 30,
        currentEpochKeys: ['epoch_key test1', 'epoch_key test2'],
        allEpks: ['allEpk1', 'allEpk2'],
        identity: 'identity',
        loadingPromise: jest.fn(),
    }

    const postData = {
        feedsByQuery: {
            new: {
                createdAt: '00',
                content: 'mocked post content',
            },
        },
        loadFeed: jest.fn(),
        feedKey: jest.fn(),
        loadComments: jest.fn(),
        
    }

    renderUserPage(userData, postData)
    expect(screen.getByText(/my stuff/i)).toBeInTheDocument()
    expect(screen.getByText(/how I use my rep in this cycle/i)).toBeInTheDocument()
    expect(screen.getByText(/Received/i)).toBeInTheDocument()
    expect(screen.getByText(/this rep is in the vault. it will be yours in the next cycle./i)).toBeInTheDocument()
    expect(screen.getByText(/system drop/i)).toBeInTheDocument()
})
