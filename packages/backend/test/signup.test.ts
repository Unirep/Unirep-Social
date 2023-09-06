// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { startServer } from './environment'
import express from 'express'

import { signUp } from './utils'

describe('signup', function () {
    this.timeout(0)
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
        const context = await startServer(deployer, app)
        Object.assign(t.context, context)
    })

    it('should sign up', async () => {
        await signUp(t)
        expect(true).to.be.true
    })

    it('should sign up many in parallel', async () => {
        const promises = [] as Promise<any>[]
        for (let x = 0; x < 10; x++) {
            promises.push(signUp(t))
        }
        await Promise.all(promises)
        expect(true).to.be.true
    })
})
