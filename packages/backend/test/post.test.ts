import test from 'ava'
import { startServer } from './environment'

import {
    createPost,
    editPost,
    deletePost,
    queryPost,
    signIn,
    signUp,
} from './utils'

test.before(async (t: any) => {
    const context = await startServer()
    Object.assign(t.context, context)
})

test('should create a post', async (t: any) => {
    const { iden } = await signUp(t)
    await signIn(t, iden)
    const { post } = await createPost(t, iden)
    const data = await queryPost(t, post._id)
    t.is(post.content, data.content)
})

test('should edit a post', async (t: any) => {
    const { iden } = await signUp(t)
    await signIn(t, iden)
    const newContent = 'new content'
    const { post } = await editPost(t, iden, newContent)
    const data = await queryPost(t, post._id)
    t.is(data.content, newContent)
})

test('should delete a post', async (t: any) => {
    const { iden } = await signUp(t)
    await signIn(t, iden)
    const { id } = await deletePost(t, iden)
    const data = await queryPost(t, id)
    t.is(data.content, '===deleted===')
})
