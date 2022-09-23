import test from 'ava'
import { startServer } from './environment'

import {
    createComment,
    createPost,
    deleteComment,
    editComment,
    queryComment,
    queryPost,
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

    // edit a comment
    const { comment } = await editComment(t, iden, post._id)
    const data = await queryComment(t, comment._id)
    t.is(data.content, 'new content')
})

test('should delete a comment', async (t: any) => {
    // sign up and sign in user
    const { iden, commitment } = await signUp(t)
    await signIn(t, commitment)

    // first create a post
    const { post } = await createPost(t, iden)

    // delete a comment
    const { comment } = await deleteComment(t, iden, post._id)
    const data = await queryComment(t, comment._id)
    t.is(data.content, null)
})
