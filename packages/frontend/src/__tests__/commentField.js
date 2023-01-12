import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserContext from '../context/User'
import PostContext from '../context/Post'
import CommentField from '../components/commentField'

const renderCommentField = (
    userData,
    postData,
    page,
    post,
    mockedCloseComment
) => {
    return render(
        <UserContext.Provider value={userData}>
            <PostContext.Provider value={postData}>
                <CommentField
                    post={post}
                    mockedCloseComment={mockedCloseComment}
                    page={page}
                ></CommentField>
            </PostContext.Provider>
        </UserContext.Provider>
    )
}

test('should render CommentField correctly with .Provider data', () => {
    const page = '/user'

    const post = {
        type: 0,
        id: 'txhash id',
        title: 'title',
        content: 'content',
        upvote: 4,
        downvote: 5,
        epoch_key: 'epoch_key test',
        username: 'username',
        post_time: '00',
        reputation: 30,
        commentCount: 6,
        current_epoch: 7,
        proofIndex: 8,
    }

    const postData = {
        commentsById: {
            commentId: {
                id: 'commentId',
                content: 'string',
                post_time: '00',
                reputation: 30,
                epoch_key: 'epoch_key test',
            },
        },
    }

    const userData = {
        userState: 'userState',
        currentEpochKeys: ['user epoch_key test'],
        username: {},
    }

    renderCommentField(userData, postData, page, post, jest.fn())
})

test(`should display "somethings wrong..." if user's state is null`, () => {
    const page = '/user'

    const postData = {
        commentsById: {
            commentId: {
                id: 'commentId',
                content: 'string',
                post_time: '00',
                reputation: 30,
                epoch_key: 'epoch_key test',
            },
        },
    }

    const userData = {
        // null user state
        userState: null,
        currentEpochKeys: ['user epoch_key test'],
    }

    renderCommentField(userData, postData, page.post, jest.fn())
    // checks users state is null
    expect(screen.getByText(/somethings wrong.../i)).toBeInTheDocument()
})
