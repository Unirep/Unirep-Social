// @ts-ignore
import { ethers } from 'hardhat'
import { BigNumberish, BigNumber } from 'ethers'
import { expect } from 'chai'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'
import * as config from '@unirep/circuits'
import { genEpochKey, schema } from '@unirep/core'
import { EpochKeyProof } from '@unirep/contracts'
import { deployUnirep } from '@unirep/contracts/deploy'
import { ZkIdentity, genRandomSalt, hashLeftRight } from '@unirep/crypto'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { EPOCH_LENGTH } from '@unirep/circuits'

import { maxReputationBudget } from '../config/socialMedia'
import { deployUnirepSocial, UnirepSocial } from '../src/utils'
import { genUserState, submitUSTProofs } from './utils'

import { UnirepSocialSynchronizer } from '../src/synchronizer'

import { SQLiteConnector } from 'anondb/node'

let synchronizer: UnirepSocialSynchronizer
const attestingFee = BigNumber.from(1)

describe('Synchronzier processes events', () => {
    before(async () => {
        const accounts = await ethers.getSigners()
        const unirepContract = await deployUnirep(accounts[0], {
            attestingFee,
        })
        const unirepSocialContract = await deployUnirepSocial(
            accounts[0],
            unirepContract.address,
            {
                airdropReputation: 30,
            }
        )
        const db = await SQLiteConnector.create(schema, ':memory:')
        synchronizer = new UnirepSocialSynchronizer(
            db,
            defaultProver,
            unirepContract,
            unirepSocialContract
        )
        // now create an attester
        await unirepContract
            .connect(accounts[1])
            .attesterSignUp()
            .then((t) => t.wait())
        await synchronizer.start()
    })

    afterEach(async () => {
        await synchronizer.waitForSync()
        const state = await genUserState(
            synchronizer.unirepContract.provider,
            synchronizer.unirepContract.address,
            new ZkIdentity()
        )
        await state.stop()
    })
    it('should process ust events', async () => {
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const commitment = id.genIdentityCommitment()

        const receipt = await synchronizer.unirepContract
            .connect(accounts[1])
            ['userSignUp(uint256)'](commitment)
            .then((t) => t.wait())
        expect(receipt.status, 'User sign up failed').to.equal(1)
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await synchronizer.unirepContract
            .beginEpochTransition()
            .then((t) => t.wait())

        const userState = await genUserState(
            ethers.provider,
            synchronizer.unirepContract.address,
            id
        )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])

        await synchronizer.unirepContract
            .beginEpochTransition()
            .then((t) => t.wait())
        await synchronizer.waitForSync()
        const proofs = await userState.genUserStateTransitionProofs()

        const [UserStateTransitioned] =
            synchronizer.unirepContract.filters.UserStateTransitioned()
                .topics as string[]
        const ust = new Promise((rs, rj) =>
            synchronizer.once(UserStateTransitioned, (event) => rs(event))
        )
        await submitUSTProofs(synchronizer.unirepContract, proofs)
        await synchronizer.waitForSync()
        await ust
    })
})
