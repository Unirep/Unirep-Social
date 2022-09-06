import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UnirepContext from '../context/Unirep'
import UserContext from '../context/User'
import PostContext from '../context/Post'
import UIContext from '../context/UI'
import MainPage from '../pages/mainPage/mainPage'

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({
        push: jest.fn(),
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
        currentEpochKeys: ['epoch_key test1', 'epoch_key test2'],
    }

    const UIData = {
        hasBanner: true,
        showBackBtn: true,
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
        netReputation: 30,
        subsidyReputation: 20,
        commentReputation: 30,
        currentEpochKeys: ['epoch_key test1', 'epoch_key test2'],
    }

    const UIData = {
        hasBanner: false,
        showBackBtn: false,
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
    expect(
        screen.getByText(
            `${userData.netReputation} | ${userData.subsidyReputation}`
        )
    ).toBeInTheDocument()
    expect(
        screen.getByText(/in this cycle, my personas are/i)
    ).toBeInTheDocument()
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
        netReputation: 30,
        subsidyReputation: 20,
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

    const uiData = {
        hasBanner: false,
    }

    renderMainPage(userData, unirepData, postData, uiData)
    // simulate user clicking on the 'create post' link
    const createPostLink = screen.getByText(/create post/i)
    await userEvent.click(createPostLink)
    expect(screen.getByText(/my rep/i)).toBeInTheDocument()
    expect(
        screen.getByText(
            `${userData.netReputation} | ${userData.subsidyReputation}`
        )
    ).toBeInTheDocument()
    expect(screen.getByText(/epoc...est1/i)).toBeInTheDocument()
    expect(screen.getByText(/epoc...est2/i)).toBeInTheDocument()
    expect(screen.getByText(/remaining time/i)).toBeInTheDocument()
})
