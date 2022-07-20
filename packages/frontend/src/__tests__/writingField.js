import { screen, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UnirepContext from '../context/Unirep'
import UserContext from '../context/User'
import PostContext from '../context/Post'
import WritingField from '../components/writingField/writingField'

import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
    rest.post('http://localhost:8545/', (req, res, ctx) => {
        return res(
            ctx.json({
                username: 'username',
                reputation: 30,
                current_epoch: 7,
                epoch_key: 'epoch_key test',
            })
        )
    }
))

beforeEach(() => server.listen({onUnhandledRequest: 'error'}))
afterAll(() => server.close())
afterEach(() => server.resetHandlers())


// abstracted render function
function renderWritingField(
    userData,
    unirepData,
    postData,
    type,
    page,
    submit
) {
    return render(
        <UserContext.Provider value={userData}>
            <UnirepContext.Provider value={unirepData}>
                <PostContext.Provider value={postData}>
                    <WritingField
                        type={type}
                        submit={submit}
                        submitBtnName={'subbtn'}
                        onClick={jest.fn()}
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

    renderWritingField(userData, unirepData, postData, type, page)
    expect(screen.getByText(/post as/i)).toBeInTheDocument()
    expect(screen.getByText(/my rep display/i)).toBeInTheDocument()
    expect(screen.getByText(/subbtn/i)).toBeInTheDocument()
})

test('should fail test with null user', () => {
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

    renderWritingField(userData, unirepData, postData, type, page)
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

// todo: fix Error: Error: connect ECONNREFUSED 127.0.0.1:3001. Test still passes but error is thrown

test.skip('should throw error text if user does not enter any value for title or content and clicks submit button', async () => {
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

    const submit = jest.fn()
    renderWritingField(userData, unirepData, postData, submit, type, page)
    const submitBtn = screen.getByText(/subbtn/i)

    expect(submitBtn).toBeInTheDocument()

    await waitFor(async () => {
        await userEvent.click(submitBtn)
    })

    expect(
        screen.getByText(/please input either title or content./i)
    ).toBeInTheDocument()
})
