import { render, screen } from '@testing-library/react'
import UserContext from '../context/User'
import PostContext from '../context/Post'
import SignupPage from '../pages/signupPage/signupPage'

test('should render SignupPage correctly with content[0]', () => {
    const userData = {
        userState: true,
        currentEpochKeys: ['epoch_key test1', 'epoch_key test2'],
        checkInvitationCode: jest.fn(),
        signUp: jest.fn(),
        identity: 'string',
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
        getAirdrop: jest.fn(),
    }

    render(
        <UserContext.Provider value={userData}>
            <PostContext.Provider value={postData}>
                <SignupPage />
            </PostContext.Provider>
        </UserContext.Provider>
    )
    expect(
        screen.getByText(
            /currently, UniRep Social is an invite only community. Please enter your invitation code below./i
        )
    ).toBeInTheDocument()
})
