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

describe('Synchronzier processes events', function () {
    this.timeout(0)

    let unirepContract
    let unirepSocialContract: UnirepSocial

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0], {
            attestingFee,
        })
        unirepSocialContract = await deployUnirepSocial(
            accounts[0],
            unirepContract.address,
            {
                airdropReputation: 30,
            }
        )
        const db = await SQLiteConnector.create(schema, ':memory:')
        console.log(db)
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
    it.skip('should process ust events', async () => {
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
    
    it('submit post should succeed', async () => {
        const attesterId = BigInt(
            await unirepContract.attesters(unirepSocialContract.address)
        )
        const id = new ZkIdentity()
        await unirepSocialContract
            .userSignUp(id.genIdentityCommitment())
            .then((t) => t.wait())
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id
        )
        const proveGraffiti = BigInt(0)
        const minPosRep = 0
        const graffitiPreImage = BigInt(0)
        const epkNonce = 0
        const defaultPostReputation = 5

        const reputationProof = await userState.genProveReputationProof(
            attesterId,
            epkNonce,
            minPosRep,
            proveGraffiti,
            graffitiPreImage,
            defaultPostReputation
        )
        console.log('hello')
        const isValid = await reputationProof.verify()
        expect(isValid, 'Verify reputation proof off-chain failed').to.be.true

        const isProofValid = await unirepContract.verifyReputation(
            reputationProof.publicSignals,
            reputationProof.proof
        )

        expect(isProofValid, 'proof is not valid').to.be.true
        const tx = await unirepSocialContract.publishPost(
            'some post text',
            reputationProof.publicSignals,
            reputationProof.proof,
            { value: attestingFee }
        )
        const receipt = await tx.wait()
        expect(receipt.status, 'Submit post failed').to.equal(1)
        // const post = await db.findOne('Post', { where:{hashedContent}})
        // expect(post.hashedContent === hashedContent)
    })
})
