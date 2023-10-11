import { Data } from '../context/Post'
import fetch from 'node-fetch'
import UnirepContext, { UnirepConfig } from '../context/Unirep'
import userContext from '../context/User'
import queueContext from '../context/Queue'

import { Post, Comment, QueryType, Vote, Draft, DataType } from '../constants'

const unirepConfig = UnirepContext._currentValue

let post
// let userContext

jest.mock('node-fetch', () => ({
    __esModule: true,
    default: jest.fn(),
}))

afterEach(() => {
    jest.clearAllMocks()
    window.localStorage.clear()
})

describe('Post', function () {
    beforeEach(() => {
        post = new Data()
    })

    test('loads the post and comment drafts from local storage', async () => {
        // mock local storage
        window.localStorage.setItem(
            'post-draft',
            JSON.stringify({ title: 'Test Post', content: 'Test content' })
        )
        window.localStorage.setItem(
            'comment-draft',
            JSON.stringify({
                title: 'Test Comment',
                content: 'Test comment content',
            })
        )

        await post.load()

        expect(post.postDraft).toEqual({
            title: 'Test Post',
            content: 'Test content',
        })
        expect(post.commentDraft).toEqual({
            title: 'Test Comment',
            content: 'Test comment content',
        })
    })
    test('saves the post and comment drafts to local storage', () => {
        post.postDraft = { title: 'Test Post', content: 'Test content' }
        post.commentDraft = {
            title: 'Test Comment',
            content: 'Test comment content',
        }

        post.save()

        expect(window.localStorage.getItem('post-draft')).toBe(
            '{"title":"Test Post","content":"Test content"}'
        )
        expect(window.localStorage.getItem('comment-draft')).toBe(
            '{"title":"Test Comment","content":"Test comment content"}'
        )
    })

    test('converts an epoch key to a hex string', () => {
        const epochKey = '12345678'
        const hexString = post.convertEpochKeyToHexString(epochKey)

        expect(hexString).toBe('bc614e')
    })

    test.skip('loads a single post and ingests it', async () => {
        // mock fetch API
        const postData = {
            id: 'test-id',
            title: 'Test Post',
            content: 'Test content',
        }
        const r = { json: () => postData }
        fetch.mockReturnValue(Promise.resolve(r))

        // mock unirepConfig.loadingPromise
        unirepConfig.loadingPromise = Promise.resolve()

        // mock convertDataToPost
        const convertDataToPostSpy = jest.spyOn(post, 'convertDataToPost')
        convertDataToPostSpy.mockImplementation(() => postData)

        // mock ingestPosts
        const ingestPostsSpy = jest.spyOn(post, 'ingestPosts')

        await post.loadPost('test-id')

        expect(convertDataToPostSpy).toHaveBeenCalledWith(postData)
        expect(ingestPostsSpy).toHaveBeenCalledWith(postData)

        // clean up
        convertDataToPostSpy.mockRestore()
        ingestPostsSpy.mockRestore()
    })

    test.skip('loadPost() functionality', async () => {
        post.epochKey = 'epochKeyString'
        console.log(post)
        await post.loadPost('idstring')
    })

    test('returns the query when epks are empty', () => {
        const query = 'test-query'
        const epks = []
        const expectedKey = query

        const key = post.feedKey(query, epks)

        expect(key).toBe(expectedKey)
    })

    test('returns the query and user when epks are not empty', () => {
        const query = 'test-query'
        const epks = ['test-epk']
        const expectedKey = `${query}-user`

        const key = post.feedKey(query, epks)

        expect(key).toBe(expectedKey)
    })

    test.skip('loads a single post and ingests it', async () => {
        // mock fetch API
        const postData = {
            id: 'test-id',
            title: 'Test Post',
            content: 'Test content',
        }
        const r = { json: () => postData }
        // mock fetch return value
        fetch.mockReturnValue(Promise.resolve(r))

        // mock BigInt function
        const bigIntSpy = jest.spyOn(global, 'BigInt')
        bigIntSpy.mockReturnValue('test-big-int')

        await post.loadPost('test-id')

        console.log(post)

        expect(post).toHaveProperty('postsById')
        // expect(post.postsById['test-id']).toEqual(postData)
        // todo: fix the way I am updating the pstsById
        console.log(post.postsById)
    })

    // todo: data.map is not a function
    test.skip('loads and ingests feed data', async () => {
        // mock fetch API
        const feedData = [
            {
                id: 'test-id-1',
                title: 'Test Post 1',
                content: 'Test content 1',
            },
            {
                id: 'test-id-2',
                title: 'Test Post 2',
                content: 'Test content 2',
            },
        ]
        const r = { json: () => feedData }
        // mock fetch return value
        fetch.mockReturnValue(Promise.resolve(r))

        // mock BigInt function
        const bigIntSpy = jest.spyOn(global, 'BigInt')
        bigIntSpy.mockReturnValue('test-big-int')

        // mock convertDataToPost function
        const convertDataToPostSpy = jest.spyOn(post, 'convertDataToPost')
        convertDataToPostSpy.mockImplementation((feedData) => feedData)

        await post.loadFeed('test-query')

        expect(convertDataToPostSpy).toHaveBeenCalledWith(feedData)
        expect(post.postsById['test-id-1']).toEqual(feedData[0])
        expect(post.postsById['test-id-2']).toEqual(feedData[1])

        // clean up
        bigIntSpy.mockRestore()
        convertDataToPostSpy.mockRestore()
    })

    // todo: TypeError: _comments.map is not a function
    test.skip('loadComments() functionality', async () => {
        const postId = 'test-post-id'
        const commentData = [
            { id: 'comment-1', content: 'Test comment 1' },
            { id: 'comment-2', content: 'Test comment 2' },
        ]

        const convertDataToCommentSpy = jest.spyOn(post, 'convertDataToComment')
        const ingestCommentsSpy = jest.spyOn(post, 'ingestComments')

        // mock fetch return value
        fetch.mockReturnValue(Promise.resolve({ json: () => commentData }))

        await post.loadCommentsByPostId(postId)

        expect(convertDataToCommentSpy).toHaveBeenCalledWith(commentData[0])
        expect(convertDataToCommentSpy).toHaveBeenCalledWith(commentData[1])
        expect(ingestCommentsSpy).toHaveBeenCalledWith(commentData)
        expect(post.commentsByPostId[postId]).toEqual([
            'comment-1',
            'comment-2',
        ])
    })

    test('ingests the comment data with loadComment()', async () => {
        const commentData = { id: '123', text: 'Test comment' }
        const r = { json: () => commentData }
        // mock fetch return value
        fetch.mockReturnValue(Promise.resolve(r))

        const ingestCommentsSpy = jest.spyOn(post, 'ingestComments')

        // mock BigInt function
        const bigIntSpy = jest.spyOn(global, 'BigInt')
        bigIntSpy.mockReturnValue('test-big-int')

        // call the loadComment method
        await post.loadComment('123')

        // assert that the ingestComments spy is called
        expect(ingestCommentsSpy).toHaveBeenCalledTimes(1)
    })
    test.skip('getAirdrop', async () => {
        // todo: find out better mock for contexts

        // mock userContext.userState
        userContext.userState = {
            waitForSync: jest.fn(() => Promise.resolve()),
        }

        // mock userContext.calculateAllEpks
        userContext.calculateAllEpks = jest.fn()

        // mock userContext.getAirdrop
        userContext.getAirdrop = jest.fn(() =>
            Promise.resolve({ transaction: 'tx' })
        )

        // mock queueContext.afterTx
        queueContext.afterTx = jest.fn(() => Promise.resolve())

        // mock queueContext.addOp
        queueContext.addOp = jest.fn((op) =>
            op({
                title: 'Test Title',
                details: 'Test Details',
            })
        )

        const blockNumber = 123
        await post.getAirdrop(blockNumber)
    })

    test('sets the draft using setDraft()', () => {
        const type = DataType.Post
        const title = 'Test Title'
        const content = 'Test Content'

        post.setDraft(type, title, content)
        expect(post.postDraft).toEqual({
            title: 'Test Title',
            content: 'Test Content',
        })

        post.setDraft(
            DataType.Comment,
            'Test Comment Title',
            'Test Comment Content'
        )
        expect(post.commentDraft).toEqual({
            title: 'Test Comment Title',
            content: 'Test Comment Content',
        })
    })

    test('converDataToComment()', () => {
        const expectedComment = {
            type: DataType.Comment,
            id: '12345',
            post_id: '54321',
            content: 'Test comment',
            upvote: 5,
            downvote: 2,
            epoch_key: 'abcdef',
            username: '',
            createdAt: '2022-01-01',
            reputation: 10,
            current_epoch: 5,
            proofIndex: 1,
            transactionHash: '0x123456789',
            lastUpdatedAt: '2022-02-01',
        }

        const comment = post.convertDataToComment(expectedComment)
        console.log(comment)
        expect(comment).toBeTruthy()
    })

    test('convertDataToPost()', () => {
        const testData = {
            _id: '12345',
            title: 'Test post',
            content: 'Test content',
            posRep: 5,
            negRep: 2,
            epochKey: 'abcdef',
            createdAt: '2022-01-01',
            minRep: 10,
            commentCount: 5,
            epoch: 5,
            proofIndex: 1,
            transactionHash: '0x123456789',
            lastUpdatedAt: '2022-02-01',
        }
        const result = post.convertDataToPost(testData)

        expect(result).toBeTruthy()
    })
})
