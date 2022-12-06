import { Data } from '../context/Post'

let post

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
