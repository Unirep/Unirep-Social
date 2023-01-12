import { screen, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PostBlock from '../components/postBlock'

import UnirepContext from '../context/Unirep'
import UserContext from '../context/User'
import PostContext from '../context/Post'
import EpochContext from '../context/EpochManager'
import QueueContext from '../context/Queue'

// abstracted render function
const renderPostBlock = (
    queueData,
    epochData,
    userData,
    unirepData,
    postId,
    postData,
    page
) => {
    return render(
        <QueueContext.Provider value={queueData}>
            <EpochContext.Provider value={epochData}>
                <UserContext.Provider value={userData}>
                    <UnirepContext.Provider value={unirepData}>
                        <PostContext.Provider value={postData}>
                            <PostBlock postId={postId} page={page} />
                        </PostContext.Provider>
                    </UnirepContext.Provider>
                </UserContext.Provider>
            </EpochContext.Provider>
        </QueueContext.Provider>
    )
}

test('should render PostBlock with mocked data', () => {
    const postId = '1'
    const page = '/post'

    const unirepData = {
        postReputation: 30,
        commentReputation: 30,
    }

    const userData = {
        userState: true,
        netReputation: 30,
        commentReputation: 30,
    }

    const postData = {
        // the '1' matches the postId being passed as an argument in renderPostBlock
        id: '1',
        postsById: {
            1: {
                createdAt: '00',
                content: 'mocked post content',
            },
        },
        commentsByPostId: {
            1: {
                content: 'comment content',
            },
        },
        commentDraft: {
            content: '',
        },
        loadCommentsByPostId: jest.fn(),
    }

    const queueData = {}
    const epochData = {}

    renderPostBlock(
        queueData,
        epochData,
        userData,
        unirepData,
        postId,
        postData,
        page
    )
    // shows no comments if no comments exist
    expect(screen.getByText(/etherscan/i)).toBeInTheDocument()
    expect(screen.getByText(/mocked post content/i)).toBeInTheDocument()
    expect(screen.getByText(/nothing to see here/i)).toBeInTheDocument()
    expect(screen.getByText(/comments/i)).toBeInTheDocument()
    expect(screen.getByText(/boost/i)).toBeInTheDocument()
    expect(screen.getByText(/squash/i)).toBeInTheDocument()
    expect(screen.getByText(/share/i)).toBeInTheDocument()
})

test("should display commentField when user's net reputation > unirep commentReputation", () => {
    const postId = '1'
    const page = '/post'

    const unirepData = {
        postReputation: 30,
        commentReputation: 30,
    }

    const userData = {
        userState: true,
        netReputation: 100,
        commentReputation: 30,
        currentEpochKeys: ['epoch_key test1', 'epoch_key test2'],
        username: {},
    }

    const postData = {
        // the '1' matches the postId being passed as an argument in renderPostBlock
        id: '1',
        postsById: {
            1: {
                createdAt: '00',
                content: 'mocked post content',
            },
        },
        commentsByPostId: {
            1: {
                content: 'comment content',
            },
        },
        commentDraft: {
            content: 'showing comment field',
        },
        loadCommentsByPostId: jest.fn(),
    }

    const queueData = {}
    const epochData = {}

    renderPostBlock(
        queueData,
        epochData,
        userData,
        unirepData,
        postId,
        postData,
        page
    )
    expect(screen.getByText(postData.commentDraft.content)).toBeInTheDocument()
})

test('test if queue and epoch context functions are triggered with correct props', () => {
    const postId = '1'
    const page = '/nothomepage'

    const unirepData = {
        postReputation: 30,
        commentReputation: 30,
    }

    const userData = {
        userState: true,
        netReputation: 100,
        commentReputation: 30,
        currentEpochKeys: ['epoch_key test1', 'epoch_key test2'],
        isInitialSyncing: null,
        username: {},
    }

    const postData = {
        // the '1' matches the postId being passed as an argument in renderPostBlock
        id: '1',
        postsById: {
            1: {
                createdAt: '00',
                content: 'mocked post content',
            },
        },
        commentsByPostId: {
            1: {
                content: 'comment content',
            },
        },
        commentDraft: {
            content: 'showing comment field',
        },
        loadCommentsByPostId: jest.fn(),
    }

    const queueData = {
        queuedOp: jest.fn(),
    }
    const epochData = {
        readyToTransition: true,
    }

    renderPostBlock(
        queueData,
        epochData,
        userData,
        unirepData,
        postId,
        postData,
        page
    )
    // expect(queueData.queuedOp).toHaveBeenCalled()
})
