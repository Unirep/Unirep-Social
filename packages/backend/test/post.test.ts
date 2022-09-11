import test from 'ava'
import { startServer } from './environment'

import { createPost, queryPost, signUp } from './utils'

test.before(async (t: any) => {
    const context = await startServer()
    Object.assign(t.context, context)
})

test('should create a post', async (t: any) => {
    const { iden } = await signUp(t)
    const { transaction } = await createPost(t, iden)
    const exist = await queryPost(t, transaction)
    t.true(exist)
})
