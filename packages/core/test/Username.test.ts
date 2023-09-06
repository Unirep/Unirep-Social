// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { deployUnirep } from '@unirep/contracts/deploy'
import { genEpochKey } from '@unirep/utils'
import { CircuitConfig } from '@unirep/circuits'
import { Identity } from '@semaphore-protocol/identity'
import { genUserState } from './utils'
import { deployUnirepSocial, Unirep, UnirepSocial } from '../deploy'
import { defaultEpochLength } from '../src/config'
const { REPL_NONCE_BITS } = CircuitConfig.default

describe('Username', function () {
    this.timeout(1000000)
    let unirepContract: Unirep
    let unirepSocialContract: UnirepSocial
    let admin
    let attesterId
    const id = new Identity()

    before(async () => {
        const accounts = await ethers.getSigners()
        admin = accounts[0]

        unirepContract = await deployUnirep(admin)
        unirepSocialContract = await deployUnirepSocial(
            admin,
            unirepContract.address
        )
        attesterId = unirepSocialContract.address

        // user sign up
        {
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                id,
                attesterId
            )
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()

            await unirepSocialContract
                .connect(admin)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
            userState.sync.stop()
        }
    })

    {
        let snapshot

        beforeEach(async () => {
            snapshot = await ethers.provider.send('evm_snapshot', [])
        })

        afterEach(async () => {
            await ethers.provider.send('evm_revert', [snapshot])
        })
    }

    it('set a username should succeed', async () => {
        const epoch = 0
        const epochKey = 1
        const oldUsername = 0
        const username = 'username1'
        const username16 = ethers.utils.hexlify(
            ethers.utils.toUtf8Bytes(username)
        )
        const index = await unirepContract.attestationCount()
        const tx = await unirepSocialContract.setUsername(
            epochKey,
            oldUsername,
            username16
        )

        const graffitiIndex = await unirepContract.sumFieldCount()
        expect(tx)
            .to.emit(unirepContract, 'Attestation')
            .withArgs(
                epoch,
                epochKey,
                attesterId,
                graffitiIndex,
                (BigInt(username16) << BigInt(REPL_NONCE_BITS)) + BigInt(index)
            )
    })

    it('should fail if the contract call was not called by admin', async () => {
        const accounts = await ethers.getSigners()
        const epochKey = 1
        const oldUsername = 0
        const username = 'username1'
        const username16 = ethers.utils.hexlify(
            ethers.utils.toUtf8Bytes(username)
        )
        await expect(
            unirepSocialContract
                .connect(accounts[5])
                .setUsername(epochKey, oldUsername, username16)
        ).to.be.revertedWith(
            'Unirep Social: Only admin can send transactions to this contract'
        )
    })

    it('should fail if a username is double registered', async () => {
        const epochKey = 1
        const oldUsername = 0
        const username = 'username1'
        const username16 = ethers.utils.hexlify(
            ethers.utils.toUtf8Bytes(username)
        )
        await unirepSocialContract
            .setUsername(epochKey, oldUsername, username16)
            .then((t) => t.wait())

        await expect(
            unirepSocialContract.setUsername(epochKey, oldUsername, username16)
        ).to.be.revertedWith('Unirep Social: This username is already taken')
    })

    it('should mark old username as not claimed', async () => {
        const epochKey = 1
        const oldUsername = 0
        const username = 'username1'
        const username16 = ethers.utils.hexlify(
            ethers.utils.toUtf8Bytes(username)
        )
        await unirepSocialContract
            .setUsername(epochKey, oldUsername, username16)
            .then((t) => t.wait())
        const isClaimedBefore = await unirepSocialContract.usernames(username16)
        expect(isClaimedBefore).to.be.true

        const newusername = 'username2'
        const newUsername16 = ethers.utils.hexlify(
            ethers.utils.toUtf8Bytes(newusername)
        )
        await unirepSocialContract
            .setUsername(epochKey, username16, newUsername16)
            .then((t) => t.wait())
        const isClaimedAfter = await unirepSocialContract.usernames(username16)
        expect(isClaimedAfter).to.be.false
    })

    it('set a username and receive an attestation should succeed UST', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const epoch = 0
        const nonce = 0
        const epochKey = genEpochKey(id.secret, attesterId, epoch, nonce)
        const oldUsername = 0
        const username10 = 'username2'
        const username16 = ethers.utils.hexlify(
            ethers.utils.toUtf8Bytes(username10)
        )
        await unirepSocialContract
            .setUsername(epochKey, oldUsername, username16)
            .then((t) => t.wait())

        // sign up another user and vote
        {
            const id2 = new Identity()
            const userState2 = await genUserState(
                ethers.provider,
                unirepContract.address,
                id2,
                attesterId
            )
            const { publicSignals, proof } =
                await userState2.genUserSignUpProof()

            await unirepSocialContract
                .connect(admin)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
            await userState2.waitForSync()

            const voteProof = await userState2.genActionProof({
                revealNonce: true,
                epkNonce: 0,
                notEpochKey: epochKey,
            })

            const upvote = 30
            const downvote = 0
            await unirepSocialContract
                .connect(admin)
                .voteSubsidy(
                    upvote,
                    downvote,
                    epochKey,
                    voteProof.publicSignals,
                    voteProof.proof
                )
                .then((t) => t.wait())
            userState2.sync.stop()
        }

        // epoch transition
        await ethers.provider.send('evm_increaseTime', [defaultEpochLength])
        await ethers.provider.send('evm_mine', [])

        // user state transition
        {
            await userState.waitForSync()
            const toEpoch = await unirepContract.attesterCurrentEpoch(
                attesterId
            )
            const { publicSignals, proof } =
                await userState.genUserStateTransitionProof({ toEpoch })
            await unirepContract
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }

        // user should prove username
        await userState.waitForSync()
        const proof = await userState.genProveReputationProof({
            graffiti: username16,
        })
        expect(await proof.verify()).to.be.true
    })

    it('should be able to use unused username', async () => {
        // set username1
        const epkNonce = 0
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { epochKey: epochKey1 } = await userState.genProveReputationProof(
            { epkNonce }
        )

        const username1_10 = 'test1'
        const username1_16 = ethers.utils.hexlify(
            ethers.utils.toUtf8Bytes(username1_10)
        )
        await unirepSocialContract
            .setUsername(epochKey1, 0, username1_16)
            .then((t) => t.wait())

        // epoch transition 1
        await ethers.provider.send('evm_increaseTime', [defaultEpochLength])
        await ethers.provider.send('evm_mine', [])

        // user state transition
        {
            await userState.waitForSync()
            const toEpoch = await unirepContract.attesterCurrentEpoch(
                attesterId
            )
            const { publicSignals, proof } =
                await userState.genUserStateTransitionProof({ toEpoch })
            await unirepContract
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }

        // user1 should prove username
        {
            await userState.waitForSync()
            const proof = await userState.genProveReputationProof({
                graffiti: username1_16,
            })
            expect(await proof.verify()).to.be.true
        }

        // set username2, username1 should be freed
        const { epochKey: epochKey2 } = await userState.genProveReputationProof(
            { epkNonce }
        )
        const username2_10 = 'test2'
        const username2_16 = ethers.utils.hexlify(
            ethers.utils.toUtf8Bytes(username2_10)
        )
        await unirepSocialContract
            .setUsername(epochKey2, username1_16, username2_16)
            .then((t) => t.wait())

        // epoch transition 2
        await ethers.provider.send('evm_increaseTime', [defaultEpochLength])
        await ethers.provider.send('evm_mine', [])

        // user state transition
        {
            await userState.waitForSync()
            const toEpoch = await unirepContract.attesterCurrentEpoch(
                attesterId
            )
            const { publicSignals, proof } =
                await userState.genUserStateTransitionProof({ toEpoch })
            await unirepContract
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }

        // user should prove username
        {
            await userState.waitForSync()
            const proof = await userState.genProveReputationProof({
                graffiti: username2_16,
            })
            expect(await proof.verify()).to.be.true
        }

        // set username to username1 again
        {
            const { epochKey: epochKey3 } =
                await userState.genProveReputationProof({ epkNonce })
            await unirepSocialContract
                .setUsername(epochKey3, username2_16, username1_16)
                .then((t) => t.wait())
        }
    })
})
