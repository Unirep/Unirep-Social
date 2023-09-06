import { screen, render, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import CommentsList from '../components/commentsList'
import PostContext from '../context/Post'

const renderCommentsField = (postData, commentIds, page, loadMoreComments) => {
    return render(
        <BrowserRouter>
            <PostContext.Provider value={postData}>
                <CommentsList
                    commentIds={commentIds}
                    page={page}
                    loadMoreComments={loadMoreComments}
                />
            </PostContext.Provider>
        </BrowserRouter>
    )
}

test('should render CommentLists correctly with data and populated commentIds array', () => {
    const commentIds = ['1']
    const page = '/post'

    const postData = {
        commentsById: {
            1: {
                id: '1',
                content: 'content from commentsById',
                createdAt: '00',
                reputation: 30,
                epoch_key: '123',
            },
        },
    }

    renderCommentsField(postData, commentIds, page, jest.fn())
    expect(screen.getByText(/post by/i)).toBeInTheDocument()
    expect(
        screen.getByText(`Post by ${postData.commentsById[1].epoch_key}`)
    ).toBeInTheDocument()
    expect(screen.getByText(/etherscan/i)).toBeInTheDocument()
    expect(screen.getByText(/content from commentsById/i)).toBeInTheDocument()
    expect(screen.getByText(/boost/i)).toBeInTheDocument()
    expect(screen.getByText(/squash/i)).toBeInTheDocument()
    expect(screen.getByText(/share/i)).toBeInTheDocument()
})

test('should render CommentLists with nothing in the commentIds array', () => {
    // commentIds is an empty array
    const commentIds = []
    const page = '/post'

    const postData = {
        commentsById: {
            1: {
                id: '1',
                content: 'content from commentsById',
                createdAt: '00',
                reputation: 30,
                epoch_key: '123',
            },
        },
    }

    renderCommentsField(postData, commentIds, page, jest.fn())
    expect(screen.getByText(/it's empty here./i)).toBeInTheDocument()
    expect(
        screen.getByText(/people just being shy, no post yet./i)
    ).toBeInTheDocument()
})
