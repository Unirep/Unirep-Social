import test from 'ava'
import { startServer } from './environment'

import {
    createComment,
    createPost,
    editComment,
    deleteComment,
    queryComment,
    signIn,
    signUp,
} from './utils'

test.before(async (t: any) => {
    const context = await startServer()
    Object.assign(t.context, context)
})

test('should create a comment', async (t: any) => {
    // sign up and sign in user
    const { iden, commitment } = await signUp(t)
    await signIn(t, commitment)

    // first create a post
    const { post } = await createPost(t, iden)

    // leave a comment
    const { comment } = await createComment(t, iden, post._id)
    const data = await queryComment(t, comment._id)
    t.is(comment.content, data.content)
})

test('should edit a comment', async (t: any) => {
    // sign up and sign in user
    const { iden, commitment } = await signUp(t)
    await signIn(t, commitment)

    // first create a post
    const { post } = await createPost(t, iden)
    const newContent = 'new content'

    // edit a comment
    const { comment } = await editComment(t, iden, post._id, newContent)
    const data = await queryComment(t, comment._id)
    t.is(data.content, newContent)
    t.not(data.latestUpdatedAt, data.createdAt)
})

test('should delete a comment', async (t: any) => {
    // sign up and sign in user
    const { iden, commitment } = await signUp(t)
    await signIn(t, commitment)

    // first create a post
    const { post } = await createPost(t, iden)

    // edit a comment
    const { id } = await deleteComment(t, iden, post._id)
    const data = await queryComment(t, id)
    t.is(data.content, '[This has been deleted...]')
    t.not(data.latestUpdatedAt, data.createdAt)

})
