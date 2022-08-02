import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserContext from '../context/User'
import PostContext from '../context/Post'
import SignupPage from '../pages/signupPage/signupPage'

const renderSignupPage = (userData, postData) => {
    return render(
        <UserContext.Provider value={userData}>
            <PostContext.Provider value={postData}>
                <SignupPage />
            </PostContext.Provider>
        </UserContext.Provider>
    )
}

test('should render SignupPage correctly with user typing into textbox', async () => {
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
        signUp: jest.fn(),
        setSignUpPromise: jest.fn(),
    }
    
    const fakeText = 'lorem ipsum dolor sit amet'

    renderSignupPage(userData, postData)
    expect(
        screen.getByText(
            /currently, UniRep Social is an invite only community. Please enter your invitation code below./i
        )
    ).toBeInTheDocument()
    expect(screen.getByText(/join us/i)).toBeInTheDocument()
    // generate text on signup page
    const textbox = screen.getByRole('textbox')
    await userEvent.type(textbox, fakeText)
    expect(screen.getByText(fakeText)).toBeInTheDocument()
})
