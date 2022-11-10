import { Data } from '../context/Post'

let post

describe('Post', function () {
    beforeEach(() => {
        post = new Data()
    })
    test.skip('load() calls localStorage', async () => {
        jest.clearAllMocks()
        const windowGetItemSpy = jest.spyOn(localStorage, 'getItem')
        await post.load()
        // todo: should be 2 calls to getItem, not 30
        expect(windowGetItemSpy).toHaveBeenCalledTimes(2)
    })
    test('save() method calls localStorage', () => {
        const windowSetItemSpy = jest.spyOn(localStorage, 'setItem')
        post.save()
        expect(windowSetItemSpy).toHaveBeenCalledTimes(2)
    })

    test.skip('loadPost() functionality', async () => {
        post.epochKey = 'epochKeyString'
        console.log(post)
        await post.loadPost('idstring')
    })

    test('feedKey() returns correct string', () => {
        const value = post.feedKey('query', ['epk'])
        expect(value).toBe('query-user')
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
