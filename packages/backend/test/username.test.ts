// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { startServer } from './environment'
import fetch from 'node-fetch'

import {
    signUp,
    setUsername,
    userStateTransition,
    genUsernameProof,
    waitForBackendBlock,
} from './utils'
import express from 'express'

describe('username', function () {
    this.timeout(0)
    const epochLength = 30000
    let t = {
        context: {},
    }
    const app = express()
    before(async () => {
        const accounts = await ethers.getSigners()
        const deployer = new ethers.Wallet(
            '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
            accounts[0].provider
        )
        const context = await startServer(deployer, app, { epochLength })
        Object.assign(t, {
            ...t,
            epochLength,
            context,
        })
    })
    it('should set a username', async () => {
        // sign up and sign in user
        const { iden } = await signUp(t)

        // first set a username
        // pre-image by default is 0
        await setUsername(t, iden, 0, 'initial-test-username123')

        // user state transition
        await userStateTransition(t, iden)

        // change the username to something else
        try {
            await setUsername(
                t,
                iden,
                'initial-test-username123',
                'second-test-username123'
            )
            expect(true).to.be.true
        } catch (e) {
            expect(false, `set username failed with error ${e}`).to.be.true
        }
    })

    it('should fail to set the username that is already taken', async () => {
        // sign up and sign in user
        const { iden } = await signUp(t)

        // first set a username
        // pre-image by default is 0
        await setUsername(t, iden, 0, 'username123')

        // user state transition
        await userStateTransition(t, iden)

        // try to change the username to the same one
        try {
            await setUsername(t, iden, 'username123', 'username123')
            expect(false).to.be.true
        } catch (err: any) {
            expect(err.toString().startsWith('Error: /username error')).to.be
                .true
        }
    })

    it('should fail to set with invalid proof', async () => {
        // sign up and sign in user
        const { iden } = await signUp(t)

        // first set a username
        // pre-image by default is 0
        await setUsername(t, iden, 0, 'username456')

        const { proof, publicSignals, blockNumber } = await genUsernameProof(
            t,
            iden,
            0
        )
        await waitForBackendBlock(t, blockNumber)

        // epoch transition and ust
        await userStateTransition(t, iden)

        // send a invalid proof
        const r = await fetch(`${(t.context as any).url}/api/usernames`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                newUsername: 'me2',
                publicSignals: publicSignals.reverse(),
                proof: proof.reverse(),
            }),
        })

        expect(r.ok).to.be.false
    })

    it('should be able to use unused username', async () => {
        // sign up
        const { iden } = await signUp(t)

        // set username to test1
        await setUsername(t, iden, 0, 'test1')
        await userStateTransition(t, iden)

        // set username to test2
        await setUsername(t, iden, 'test1', 'test2')
        await userStateTransition(t, iden)

        // set username to test1 again
        try {
            await setUsername(t, iden, 'test2', 'test1')
            expect(true).to.be.true
        } catch (e) {
            expect(false, `fail to set unused username: ${e}`).to.be.true
        }
    })

    it('if preImage is wrong, not able to set new username', async () => {
        // sign up
        const { iden } = await signUp(t)

        // set username to test3
        await setUsername(t, iden, 0, 'test3')
        await userStateTransition(t, iden)

        // try to set username from test_wrong to test4 before ust
        try {
            await setUsername(t, iden, 'test_wrong', 'test4')
            expect(false, `set preImage as test_wrong successfully`).to.be.true
        } catch (e) {
            expect(true).to.be.true
        }
    })

    it('cannot set username multiple times in an epoch', async () => {
        // sign up
        const { iden } = await signUp(t)

        // set username to test5
        await setUsername(t, iden, 0, 'test5')

        // set username to test6
        try {
            await setUsername(t, iden, 0, 'test6')
            expect(false, `should not allow user to set username twice`).to.be
                .true
        } catch (e) {
            expect(true).to.be.true
        }
    })
})
