import test from 'ava'
import { startServer } from './environment'

import {
    createComment,
    createPost,
    deleteComment,
    editComment,
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
    const { transaction } = await createPost(t, iden)
    const exist = await queryPost(t, transaction)
    t.true(exist)

    // leave a comment
    await createComment(t, iden, transaction)
    t.pass()
})

test('should edit a comment', async (t: any) => {
    // sign up and sign in user
    const { iden, commitment } = await signUp(t)
    await signIn(t, commitment)

    // first create a post
    const { transaction } = await createPost(t, iden)
    const exist = await queryPost(t, transaction)
    t.true(exist)

    // leave a comment
    const comment = await createComment(t, iden, transaction)

    // edit a comment
    await editComment(t, iden, comment.transaction)
    t.pass()
})

test('should delete a comment', async (t: any) => {
    // sign up and sign in user
    const { iden, commitment } = await signUp(t)
    await signIn(t, commitment)

    // first create a post
    const { transaction } = await createPost(t, iden)
    const exist = await queryPost(t, transaction)
    t.true(exist)

    // leave a comment
    const comment = await createComment(t, iden, transaction)

    // edit a comment
    await deleteComment(t, iden, comment.transaction)
    t.pass()
})
