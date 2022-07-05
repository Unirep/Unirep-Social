import test from 'ava'
import { startServer } from './environment'

import { createComment, createPost, queryPost, signUp, vote } from './utils'

test.before(async (t: any) => {
    const context = await startServer()
    Object.assign(t.context, context)
})

test('should vote on a post', async (t: any) => {
    // sign up first user
    const user1 = await signUp(t)

    // first create a post
    const { post, transaction } = await createPost(t, user1.iden)
    const exist = await queryPost(t, transaction)
    t.true(exist)

    // sign up second user
    const user2 = await signUp(t)

    // upvote the post
    {
        const upvote = 5
        const downvote = 0
        const dataId = transaction
        const receiver = post.epochKey.toString(16)
        await vote(t, user2.iden, receiver, dataId, true, upvote, downvote)
    }

    // downvote the post
    {
        const upvote = 0
        const downvote = 2
        const dataId = transaction
        const receiver = post.epochKey.toString(16)
        await vote(t, user2.iden, receiver, dataId, true, upvote, downvote)
    }
    t.pass()
})

test('should vote on comment', async (t: any) => {
    // sign up first user
    const user1 = await signUp(t)

    // first create a post
    const post = await createPost(t, user1.iden)
    const exist = await queryPost(t, post.transaction)
    t.true(exist)

    // leave a comment
    // Object.assign(t.context, { ...t.context, postId: post.transaction })
    const { comment, transaction } = await createComment(
        t,
        user1.iden,
        post.transaction
    )

    // sign up second user
    const user2 = await signUp(t)

    // upvote the comment
    {
        const upvote = 4
        const downvote = 0
        const dataId = transaction
        const receiver = comment.epochKey.toString(16)
        await vote(t, user2.iden, receiver, dataId, false, upvote, downvote)
    }

    // downvote the comment
    {
        const upvote = 0
        const downvote = 1
        const dataId = transaction
        const receiver = comment.epochKey.toString(16)
        await vote(t, user2.iden, receiver, dataId, false, upvote, downvote)
    }
    t.pass()
})
