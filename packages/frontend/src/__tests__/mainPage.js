import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UnirepContext from '../context/Unirep'
import UserContext from '../context/User'
import PostContext from '../context/Post'
import MainPage from '../pages/mainPage/mainPage'

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({
        push: jest.fn(),
    }),
}))

// abstracted render function
const renderMainPage = (userData, unirepData, postData) => {
    return render(
        <UserContext.Provider value={userData}>
            <UnirepContext.Provider value={unirepData}>
                <PostContext.Provider value={postData}>
                    <MainPage />
                </PostContext.Provider>
            </UnirepContext.Provider>
        </UserContext.Provider>
    )
}

test('should render MainPage with mocked data and false UserState', () => {
    // provier data
    const unirepData = {
        postReputation: 30,
        commentReputation: 30,
    }
    const userData = {
        userState: false,
        netReputation: 30,
        commentReputation: 30,
        currentEpochKeys: ['epoch_key test1', 'epoch_key test2'],
    }

    const postData = {
        feedsByQuery: {
            new: {
                createdAt: '00',
                content: 'mocked post content',
            },
        },
        loadFeed: jest.fn(),
    }
    renderMainPage(userData, unirepData, postData)
    expect(
        screen.getByText(/community built on ideas, not identities./i)
    ).toBeInTheDocument()
    expect(
        screen.getByText(/stay up to date & share everything with everyone./i)
    ).toBeInTheDocument()
    // userState is *false* so login text is rendered
    expect(
        screen.getByText(/you must join or login to create post/i)
    ).toBeInTheDocument()
    expect(
        screen.getByText(/stay up to date & share everything with everyone./i)
    ).toBeInTheDocument()
})

test('should render MainPage with mocked data and true UserState', () => {
    // provier data
    const unirepData = {
        postReputation: 30,
        commentReputation: 30,
    }

    const userData = {
        userState: true,
        netReputation: 30,
        commentReputation: 30,
        currentEpochKeys: ['epoch_key test1', 'epoch_key test2'],
    }

    const postData = {
        feedsByQuery: {
            new: {
                createdAt: '00',
                content: 'mocked post content',
            },
        },
        loadFeed: jest.fn(),
    }
    renderMainPage(userData, unirepData, postData)
    expect(
        screen.getByText(/community built on ideas, not identities./i)
    ).toBeInTheDocument()
    expect(
        screen.getByText(/stay up to date & share everything with everyone./i)
    ).toBeInTheDocument()
    // userState is *true*
    expect(screen.getByText(/my rep/i)).toBeInTheDocument()
    expect(screen.getByText(userData.netReputation)).toBeInTheDocument()
    expect(
        screen.getByText(/in this cycle, my personas are/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/back to top/i)).toBeInTheDocument()
})

test.skip('should simulate user the "/new" route onClick while user is logged in', async () => {
    // provier data
    const unirepData = {
        postReputation: 30,
        commentReputation: 30,
    }

    const userData = {
        userState: true,
        netReputation: 30,
        commentReputation: 30,
        currentEpochKeys: ['epoch_key test1', 'epoch_key test2'],
    }

    const postData = {
        feedsByQuery: {
            new: {
                createdAt: '00',
                content: 'mocked post content',
            },
        },
        loadFeed: jest.fn(),
    }
    renderMainPage(userData, unirepData, postData)
    // simulate user clicking on the 'create post' link
    const createPostLink = screen.getByText(/create post/i)
    await userEvent.click(createPostLink)
    expect(screen.getByText(/new/i)).toBeInTheDocument()
})
