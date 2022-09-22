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
    const { transaction } = await createPost(t, iden)
    const exist = await queryPost(t, transaction)
    t.true(exist)
})

test('should edit a post', async (t: any) => {
    const { iden } = await signUp(t)
    await signIn(t, iden)
    const { transaction } = await createPost(t, iden)
    const exist = await queryPost(t, transaction)
    t.true(exist)

    await editPost(t, iden, transaction)
    t.pass()
})

test('should delete a post', async (t: any) => {
    const { iden } = await signUp(t)
    await signIn(t, iden)
    const { transaction } = await createPost(t, iden)
    const exist = await queryPost(t, transaction)
    t.true(exist)

    await deletePost(t, iden, transaction)
    t.pass()
})
