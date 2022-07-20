import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CommentBlock from '../components/postBlock/commentBlock'
import UnirepContext from '../context/Unirep'
import PostContext from '../context/Post

// mocked props
const commentId = 'commentId'
const page = '/user'

function renderCommentBlock(unirepData, postData, commentId, page) {
    return render(
        <UnirepContext.Provider value={unirepData}>
            <PostContext.Provider value={postData}>
                <CommentBlock commentId={commentId} page={page} />
            </PostContext.Provider>
        </UnirepContext.Provider>
    )
}

test('should render CommentBlock correctly .Provider data', () => {
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

    const unirepData = {
        unirepConfig: {
            commentReptation: 30,
        },
    }

    renderCommentBlock(unirepData, postData, commentId, page)
    expect(screen.getByText(/etherscan/i)).toBeInTheDocument()
    expect(screen.getByText(/epoch_key test/i)).toBeInTheDocument()
})

test('on hover, reputation is shown from Unirep context', () => {
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

    const unirepData = {
        unirepConfig: {
            commentReptation: 30,
        },
    }

    renderCommentBlock(unirepData, postData, commentId, page)
    userEvent.hover(document.getElementsByClassName('user')[0])
    // checks if reputation amount is shown
    expect(screen.getByText(/30/i)).toBeInTheDocument()
})
