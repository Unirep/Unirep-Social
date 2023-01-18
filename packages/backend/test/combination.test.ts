import test from 'ava'
import { startServer } from './environment'

import {
    createPost,
    createPostSubsidy,
    vote,
    signUp,
    setUsername,
    epochTransition,
    userStateTransition,
} from './utils'

const EPOCH_LENGTH = 20000

test.before(async (t: any) => {
    const context = await startServer({ epochLength: EPOCH_LENGTH / 1000 })
    Object.assign(t.context, context)
})

// test('should be able to use unused username', async (t: any) => {
//     // sign up
//     const { iden, commitment } = await signUp(t)

//     // set username to test1
//     await setUsername(t, iden, 0, 'test1')

//     // set username to test2
//     await setUsername(t, iden, 0, 'test2')

//     // epoch transition
//     await new Promise((r) => setTimeout(r, EPOCH_LENGTH))
//     const prevEpoch = await t.context.unirep.currentEpoch()
//     await epochTransition(t)
//     for (;;) {
//         await new Promise((r) => setTimeout(r, 1000))
//         const findEpoch = await t.context.db.findOne('Epoch', {
//             where: { number: Number(prevEpoch) },
//         })
//         if (findEpoch) break
//     }

//     // user state transition
//     await userStateTransition(t, iden)

//     // set username to test1 again
//     try {
//         await setUsername(t, iden, 0, 'test1')
//         t.pass('successfully set unused username')
//     } catch (e) {
//         t.fail('fail to set unused username')
//     }
// })

// test('if the user has username, should not pass 0 in the preImage while setting up username', async (t: any) => {
//     // sign up and sign in user
//     const { iden, commitment } = await signUp(t)

//     // set up username
//     await setUsername(t, iden, 0, 'test3')

//     // epoch transition
//     await new Promise((r) => setTimeout(r, EPOCH_LENGTH))
//     const prevEpoch = await t.context.unirep.currentEpoch()
//     await epochTransition(t)
//     for (;;) {
//         await new Promise((r) => setTimeout(r, 1000))
//         const findEpoch = await t.context.db.findOne('Epoch', {
//             where: { number: Number(prevEpoch) },
//         })
//         if (findEpoch) break
//     }

//     // user state transition
//     await userStateTransition(t, iden)

//     try {
//         await setUsername(t, iden, 0, 'test4')
//         t.fail('pass 0 as preImage and succeed')
//     } catch (e) {
//         t.pass('reset username should pass previous username in')
//     }
// })

test.serial(
    'after setting up username and get reputation, the user can still do actions after user state transition',
    async (t: any) => {
        // sign up users
        const user1 = await signUp(t)
        const user2 = await signUp(t)

        // create posts
        const { post: post1 } = await createPostSubsidy(t, user1.iden)

        // set up username
        await setUsername(t, user1.iden, 0, 'test5')

        // vote
        {
            const upvote = 5
            const downvote = 0
            const receiver = post1.epochKey.toString()
            await vote(
                t,
                user2.iden,
                receiver,
                post1._id,
                true,
                upvote,
                downvote
            )
        }

        // epoch transition & user state transition
        {
            await epochTransition(t)
            await userStateTransition(t, user1.iden)
            await userStateTransition(t, user2.iden)
        }

        // user1 make post
        try {
            await createPostSubsidy(t, user1.iden)
            t.pass('successfully create a post after ust')
        } catch (e) {
            t.fail('fail to create a post after ust')
        }
    }
)

test.serial(
    'after setting up username and get reputation, the user can still pass the user state transition',
    async (t: any) => {
        // sign up users
        const user3 = await signUp(t)
        const user4 = await signUp(t)

        // set up username
        await setUsername(t, user3.iden, 0, 'test6')

        {
            console.log('user3 and user4 do epoch transition')
            // epoch transition
            await epochTransition(t)

            // user state transition
            await userStateTransition(t, user3.iden)
            await userStateTransition(t, user4.iden)
        }

        // create posts
        const { post } = await createPost(t, user3.iden)

        // vote
        {
            const upvote = 5
            const downvote = 0
            const receiver = post.epochKey.toString()
            await vote(
                t,
                user4.iden,
                receiver,
                post._id,
                true,
                upvote,
                downvote
            )
        }

        // epoch transition
        await epochTransition(t)

        // user state transition
        try {
            await userStateTransition(t, user3.iden)
            t.pass('successfully ust after getting rep while having a username')
        } catch (e) {
            t.fail('fail to ust after getting rep while having a username')
        }
    }
)
