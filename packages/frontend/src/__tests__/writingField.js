import { screen, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UnirepContext from '../context/Unirep'
import UserContext from '../context/User'
import PostContext from '../context/Post'
import WritingField from '../components/writingField'

// abstracted render function
const renderWritingField = (
    userData,
    unirepData,
    postData,
    type,
    page,
    showDetail,
    submit
) => {
    return render(
        <UserContext.Provider value={userData}>
            <UnirepContext.Provider value={unirepData}>
                <PostContext.Provider value={postData}>
                    <WritingField
                        type={type}
                        submit={submit}
                        submitBtnName={'subbtn'}
                        onClick={jest.fn()}
                        showDetail={showDetail}
                    />
                </PostContext.Provider>
            </UnirepContext.Provider>
        </UserContext.Provider>
    )
}

test('should render WritingField correctly with .Provider data', () => {
    const page = '/user'
    const type = 0
    const unirepData = {
        unirepConfig: {
            commentReptation: 30,
        },
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
    }

    renderWritingField(userData, unirepData, postData, type, page, true)
    expect(screen.getByText(/subbtn/i)).toBeInTheDocument()
})

test('should display "somethings wrong..." with null user', () => {
    const page = '/user'
    const type = 0
    const unirepData = {
        unirepConfig: {
            commentReptation: 30,
        },
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
        userState: null,
        currentEpochKeys: ['user epoch_key test'],
    }

    renderWritingField(userData, unirepData, postData, type, page, true)
    expect(screen.getByText(/somethings wrong.../i)).toBeInTheDocument()
})

test('should render Post Draft content in textarea', async () => {
    const page = '/user'
    const type = 0
    const unirepData = {
        unirepConfig: {
            commentReptation: 30,
        },
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
        setDraft: jest.fn(),
        postDraft: {
            title: 'Post Draft title',
            content: 'Post Draft content',
        },
        commentDraft: {
            title: 'Comment Draft title',
            content: 'Comment Draft content',
        },
    }

    const userData = {
        userState: true,
        currentEpochKeys: ['user epoch_key test'],
    }

    renderWritingField(userData, unirepData, postData, type, page)
    expect(screen.getByText(/post draft content/i)).toBeInTheDocument()
})
