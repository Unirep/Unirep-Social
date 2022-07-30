import { screen, render, waitFor } from '@testing-library/react'
import UserContext from '../context/User'
import PostContext from '../context/Post'
import PostsList from '../components/postsList/postsList'

const renderPostsList = (userData, postData, postIds = 0) => {
    return render(
        <UserContext.Provider value={userData}>
            <PostContext.Provider value={postData}>
                <PostsList postIds={postIds} loadMorePosts={jest.fn()} />
            </PostContext.Provider>
        </UserContext.Provider>
    )
}

test('should render PostsList correctly *without* posts', () => {
    renderPostsList()
    expect(screen.getByText(/it's empty here./i)).toBeInTheDocument()
    expect(
        screen.getByText(/people just being shy, no post yet./i)
    ).toBeInTheDocument()
    expect(screen.queryByText(/load more posts/i)).not.toBeInTheDocument()
})

test('should render PostsList with PostBlock child component', () => {
    const postIds = ['1']

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
        postsById: {
            1: {
                createdAt: '00',
                content: 'mocked post content',
            },
        },
        votesByPostId: {
            1: ['1'],
        },
        commentsByPostId: {
            1: ['1'],
        },
        loadVotesForPostId: jest.fn(),
        loadVotesForCommentId: jest.fn(),
        commentDraft: {
            content: 'mocked comment draft content',
        },
        loadCommentsByPostId: jest.fn(),
    }

    renderPostsList(userData, postData, postIds)
    expect(screen.getByText(/post by/i)).toBeInTheDocument()
    expect(screen.getByText(/etherscan/i)).toBeInTheDocument()
    expect(screen.getByText(/mocked post content/i)).toBeInTheDocument()
    expect(screen.getByText(/comments/i)).toBeInTheDocument()
    expect(screen.getByText(/boost/i)).toBeInTheDocument()
    expect(screen.getByText(/squash/i)).toBeInTheDocument()
    expect(screen.getByText(/share/i)).toBeInTheDocument()
})
