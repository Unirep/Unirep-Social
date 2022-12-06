import { Data } from '../context/Post'
import fetch from 'node-fetch'
import UnirepContext, { UnirepConfig } from '../context/Unirep'

const unirepConfig = UnirepContext._currentValue

let post

jest.mock('node-fetch', () => ({
    __esModule: true,
    default: jest.fn(),
    BigInt: jest.fn(),
}))

afterEach(() => {
    jest.clearAllMocks()
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
    // TODO: undefined to a BigInt error
    test.skip('loadPost() calls injestPosts', async () => {
        const ingestPostSpy = jest.spyOn(post, 'ingestPosts')

        await post.loadPost('idstring')
        expect(ingestPostSpy).toHaveBeenCalled()
    })
    // TODO: data.map is not a function
    test.skip('loadFeed() functionality', async () => {
        await post.loadFeed('queryString', '1', ['0000'])
    })
    test.skip('loadComments() functionality', async () => {
        await post.loadComments('queryString', '1', ['0000'])
    })

    test.skip('getAirdrop() functionality', async () => {
        const addOpSpy = jest.spyOn(queue, 'addOp')

        await post.getAirdrop('1')
        expect(addOpSpy).toHaveBeenCalledTimes(1)
    })
})
