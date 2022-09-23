import test from 'ava'
import { startServer } from './environment'

import {
    createPost,
    deletePost,
    editPost,
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
    const { post } = await editPost(t, iden)
    const data = await queryPost(t, post._id)
    t.is(data.content, 'new content')
})

test('should delete a post', async (t: any) => {
    const { iden } = await signUp(t)
    await signIn(t, iden)
    const { post } = await deletePost(t, iden)
    const data = await queryPost(t, post._id)
    t.is(data.content, null)
})
