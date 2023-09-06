import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UnirepContext from '../context/Unirep'
import UserContext from '../context/User'
import PostContext from '../context/Post'
import UIContext, { EpochStatus } from '../context/UI'
import MainPage from '../pages/mainPage/mainPage'

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

// abstracted render function
const renderMainPage = (userData, unirepData, postData, UIData) => {
    return render(
        <UIContext.Provider value={UIData}>
            <UserContext.Provider value={userData}>
                <UnirepContext.Provider value={unirepData}>
                    <PostContext.Provider value={postData}>
                        <MainPage />
                    </PostContext.Provider>
                </UnirepContext.Provider>
            </UserContext.Provider>
        </UIContext.Provider>
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
        currentEpochKeys: ['123', '456'],
    }

    const UIData = {
        hasBanner: true,
        scrollTop: 500,
    }

    const postData = {
        feeds: {
            new: {
                createdAt: '00',
                content: 'mocked post content',
            },
        },
        loadFeed: jest.fn(),
    }
    renderMainPage(userData, unirepData, postData, UIData)
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
    expect(screen.getByText(/back to top/i)).toBeInTheDocument()
})

test('should render MainPage with mocked data and true UserState', () => {
    // provier data
    const unirepData = {
        postReputation: 30,
        commentReputation: 30,
    }

    const userData = {
        userState: true,
        id: {},
        netReputation: 30,
        subsidyReputation: 20,
        commentReputation: 30,
        currentEpochKeys: ['123', '456'],
    }

    const UIData = {
        hasBanner: false,
        scrollTop: 0,
        epochStatus: EpochStatus.default,
    }

    const postData = {
        feeds: {
            new: {
                createdAt: '00',
                content: 'mocked post content',
            },
        },
        loadFeed: jest.fn(),
    }
    renderMainPage(userData, unirepData, postData, UIData)
    const bannerText1 = screen.queryByText(
        /community built on ideas, not identities./i
    )
    expect(bannerText1).toBeNull()
    const bannerText2 = screen.queryByText(
        /stay up to date & share everything with everyone./i
    )
    expect(bannerText2).toBeNull()

    // userState is *true*
    expect(screen.getByText(/my rep/i)).toBeInTheDocument()
    expect(screen.getByText(`${userData.netReputation}`)).toBeInTheDocument()
    expect(
        screen.getByText(`${userData.subsidyReputation}`)
    ).toBeInTheDocument()
    expect(screen.getByText(/Personas/i)).toBeInTheDocument()
    const back2top = screen.queryByText(/back to top/i)
    expect(back2top).toBeNull()
})

test('should page rerender after user clicks create post button', async () => {
    // provier data
    const unirepData = {
        postReputation: 30,
        commentReputation: 30,
    }

    const userData = {
        userState: true,
        id: {},
        netReputation: 30,
        subsidyReputation: 20,
        commentReputation: 30,
        currentEpochKeys: ['134', '256'],
    }

    const postData = {
        feeds: {
            new: {
                createdAt: '00',
                content: 'mocked post content',
            },
        },
        loadFeed: jest.fn(),
    }

    const uiData = {
        hasBanner: false,
        epochStatus: EpochStatus.default,
    }

    renderMainPage(userData, unirepData, postData, uiData)
    // simulate user clicking on the 'create post' link
    const createPostLink = screen.getByText(/create post/i)
    await waitFor(() => {
        userEvent.click(createPostLink)
    })
    expect(screen.getByText(/my rep/i)).toBeInTheDocument()
    expect(screen.getByText(`${userData.netReputation}`)).toBeInTheDocument()
    expect(
        screen.getByText(`${userData.subsidyReputation}`)
    ).toBeInTheDocument()
    const epk1 = screen.getAllByText(/134/i)[0]
    const epk2 = screen.getAllByText(/256/i)[0]
    expect(epk1).toBeInTheDocument()
    expect(epk2).toBeInTheDocument()
    expect(screen.getByText(/Transition at/i)).toBeInTheDocument()
})
