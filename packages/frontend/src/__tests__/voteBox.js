import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserContext from '../context/User'
import PostContext from '../context/Post'
import VoteBox from '../components/voteBox'

const renderVoteBox = (
    userData,
    postData,
    isUpVote,
    closeVote,
    dataId,
    isPost
) => {
    return render(
        <UserContext.Provider value={userData}>
            <PostContext.Provider value={postData}>
                <VoteBox
                    isUpVote={isUpVote}
                    closeVote={closeVote}
                    dataId={dataId}
                    isPost={isPost}
                />
            </PostContext.Provider>
        </UserContext.Provider>
    )
}

test('should render VoteBox correctly with mocked .Provider data and props', () => {
    const isUpVote = false
    const closeVote = jest.fn()
    const dataId = '1'
    const isPost = true

    const userData = {
        userState: true,
        currentEpochKeys: ['epoch_key test1', 'epoch_key test2'],
    }

    const postData = {
        postsById: {
            1: {
                current_epoch: 7,
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
    }

    renderVoteBox(userData, postData, isUpVote, closeVote, dataId, isPost)
    expect(
        screen.getByText(/tune up the amount of Rep to squash this post/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/squash this post/i)).toBeInTheDocument()
    // expect(screen.getByText(/epoc...est1/i)).toBeInTheDocument()
    // expect(screen.getByText(/epoc...est2/i)).toBeInTheDocument()
    expect(screen.getByText(/outdated/i)).toBeInTheDocument()
    expect(screen.getByText(/history/i)).toBeInTheDocument()
    expect(
        screen.getByText(/you have not squashed this before/i)
    ).toBeInTheDocument()
    // 1 is the givenAmount set my useState in VoteBox
    expect(screen.getByRole('spinbutton')).toHaveValue(1)
})

test('should display empty div with false userState', async () => {
    const isUpVote = true
    const closeVote = jest.fn()
    const dataId = '1'
    const isPost = true

    const userData = {
        userState: false,
        currentEpochKeys: ['epoch_key test1', 'epoch_key test2'],
        currentEpoch: 1,
    }

    const postData = {
        postsById: {
            1: {
                current_epoch: 7,
                content: 'mocked post content',
            },
        },
        votesById: {
            10: {
                posRep: 7,
                negRep: 3,
                voter: '0x1234567890123456789012345678901234567890',
            },
        },
        votesByPostId: {
            14: {
                commentId: ['10'],
            },
        },
        commentsByPostId: {
            11: ['11'],
        },
        loadVotesForPostId: jest.fn(),
        loadVotesForCommentId: jest.fn(),
    }

    renderVoteBox(userData, postData, isUpVote, closeVote, dataId, isPost)
    // checking if nothing is rendered
    expect(
        screen.queryByText(/tune up the amount of rep/i)
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/history/i)).not.toBeInTheDocument()
})
