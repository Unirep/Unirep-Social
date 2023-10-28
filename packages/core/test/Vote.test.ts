// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { deployUnirep } from '@unirep/contracts/deploy'
import { Identity } from '@semaphore-protocol/identity'
import { genEpochKey } from '@unirep/utils'
import { deployUnirepSocial, Unirep, UnirepSocial } from '../deploy'
import { genUserState } from './utils'
import { defaultEpochLength } from '../src/config'

describe('Vote', function () {
    this.timeout(1000000)
    let unirepContract: Unirep
    let unirepSocialContract: UnirepSocial
    let admin
    let attesterId
    let chainId
    const id = new Identity()
    const receiver = new Identity()
    const content = 'some post text'
    const hashedContent = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(content)
    )
    const upvoteValue = 5
    const downvoteValue = 4
    let toEpochKey
    const epkNonce = 0
    const revealNonce = true

    before(async () => {
        const accounts = await ethers.getSigners()
        admin = accounts[0]
        const network = await accounts[0].provider.getNetwork()
        chainId = network.chainId

        unirepContract = await deployUnirep(admin)
        unirepSocialContract = await deployUnirepSocial(
            admin,
            unirepContract.address
        )
        attesterId = unirepSocialContract.address
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )

        // user sign up
        {
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()

            await unirepSocialContract
                .connect(admin)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }
        // user 1 epoch key
        const epoch = await unirepContract.attesterCurrentEpoch(attesterId)
        const nonce = 0
        const epochKey = genEpochKey(
            id.secret,
            attesterId,
            epoch,
            nonce,
            chainId
        )

        // sign up another user and vote
        {
            const userState2 = await genUserState(
                ethers.provider,
                unirepContract.address,
                receiver,
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
            userState2.stop()
        }

        // epoch transition
        await ethers.provider.send('evm_increaseTime', [defaultEpochLength])
        await ethers.provider.send('evm_mine', [])

        // user state transition
        {
            const toEpoch = await unirepContract.attesterCurrentEpoch(
                attesterId
            )
            await userState.waitForSync()
            const { publicSignals, proof } =
                await userState.genUserStateTransitionProof({ toEpoch })
            await unirepContract
                .connect(admin)
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }

        // receiver user state transition
        {
            const toEpoch = await unirepContract.attesterCurrentEpoch(
                attesterId
            )
            const userState2 = await genUserState(
                ethers.provider,
                unirepContract.address,
                receiver,
                attesterId
            )
            const { publicSignals, proof } =
                await userState2.genUserStateTransitionProof({ toEpoch })
            await unirepContract
                .connect(admin)
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }

        // post
        {
            const postReputation = await unirepSocialContract.postReputation()
            await userState.waitForSync()
            const { publicSignals, proof } = await userState.genActionProof({
                spentRep: postReputation.toNumber(),
            })
            await unirepSocialContract
                .publishPost(hashedContent, publicSignals, proof)
                .then((t) => t.wait())
        }
        userState.stop()
        const currentEpoch = await unirepContract.attesterCurrentEpoch(
            attesterId
        )
        toEpochKey = genEpochKey(
            receiver.secret,
            attesterId,
            currentEpoch,
            nonce,
            chainId
        )
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

    it('submit upvote should succeed', async () => {
        const epoch = await unirepContract.attesterCurrentEpoch(attesterId)
        const downvote = 0
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const {
            publicSignals,
            proof,
            epochKey: fromEpochKey,
        } = await userState.genActionProof({
            notEpochKey: toEpochKey,
            spentRep: upvoteValue,
        })

        const tx = await unirepSocialContract.vote(
            upvoteValue,
            downvote,
            toEpochKey,
            publicSignals,
            proof
        )
        await expect(tx)
            .to.emit(unirepSocialContract, 'VoteSubmitted')
            .withArgs(epoch, fromEpochKey, toEpochKey, upvoteValue, downvote, 0)
        userState.stop()
    })

    it('submit upvote with min rep should succeed', async () => {
        const epoch = await unirepContract.attesterCurrentEpoch(attesterId)
        const downvote = 0
        const minRep = 10
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const {
            publicSignals,
            proof,
            epochKey: fromEpochKey,
        } = await userState.genActionProof({
            notEpochKey: toEpochKey,
            spentRep: upvoteValue,
            minRep,
        })

        const tx = await unirepSocialContract.vote(
            upvoteValue,
            downvote,
            toEpochKey,
            publicSignals,
            proof
        )
        await expect(tx)
            .to.emit(unirepSocialContract, 'VoteSubmitted')
            .withArgs(
                epoch,
                fromEpochKey,
                toEpochKey,
                upvoteValue,
                downvote,
                minRep
            )
        userState.stop()
    })

    it('submit upvote with different amount of nullifiers should fail', async () => {
        const downvote = 0
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const wrongValue = upvoteValue - 2
        const { publicSignals, proof } = await userState.genActionProof({
            notEpochKey: toEpochKey,
            spentRep: wrongValue,
        })

        await expect(
            unirepSocialContract.vote(
                upvoteValue,
                downvote,
                toEpochKey,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: invalid rep nullifier')
        userState.stop()
    })

    it('submit vote with both upvote and downvote value should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            notEpochKey: toEpochKey,
            spentRep: upvoteValue,
        })

        await expect(
            unirepSocialContract.vote(
                upvoteValue,
                downvoteValue,
                toEpochKey,
                publicSignals,
                proof
            )
        ).to.be.revertedWith(
            'Unirep Social: should only choose to upvote or to downvote'
        )
        userState.stop()
    })

    it('submit vote with 0 value should fail', async () => {
        const zeroVote = 0
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            notEpochKey: toEpochKey,
            spentRep: upvoteValue,
        })
        await expect(
            unirepSocialContract.vote(
                zeroVote,
                zeroVote,
                toEpochKey,
                publicSignals,
                proof
            )
        ).to.be.revertedWith(
            'Unirep Social: should submit a positive vote value'
        )
        userState.stop()
    })

    it('submit upvote proof twice should fail', async () => {
        const downvote = 0
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            notEpochKey: toEpochKey,
            spentRep: upvoteValue,
        })
        await unirepSocialContract
            .vote(upvoteValue, downvote, toEpochKey, publicSignals, proof)
            .then((t) => t.wait())
        await expect(
            unirepSocialContract.vote(
                upvoteValue,
                downvote,
                toEpochKey,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: the proof is submitted before')
        userState.stop()
    })

    it('the receiver should successfully receive pos rep', async () => {
        // upvote the receiver
        {
            const downvote = 0
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                id,
                attesterId
            )
            const { publicSignals, proof } = await userState.genActionProof({
                notEpochKey: toEpochKey,
                spentRep: upvoteValue,
            })
            await unirepSocialContract
                .vote(upvoteValue, downvote, toEpochKey, publicSignals, proof)
                .then((t) => t.wait())
            userState.stop()
        }

        // epoch transition
        await ethers.provider.send('evm_increaseTime', [defaultEpochLength])
        await ethers.provider.send('evm_mine', [])

        // receiver user state transition

        const userState2 = await genUserState(
            ethers.provider,
            unirepContract.address,
            receiver,
            attesterId
        )
        const toEpoch = await unirepContract.attesterCurrentEpoch(attesterId)
        const { publicSignals, proof } =
            await userState2.genUserStateTransitionProof({ toEpoch })
        await unirepContract
            .userStateTransition(publicSignals, proof)
            .then((t) => t.wait())

        // receiver prove min rep
        await userState2.waitForSync()
        const repProof = await userState2.genProveReputationProof({
            minRep: upvoteValue,
        })
        expect(repProof.proveMinRep).to.equal('1')
        expect(repProof.minRep).to.equal(upvoteValue.toString())
        expect(await repProof.verify()).to.be.true
        userState2.stop()
    })

    it('submit upvote subsidy should succeed', async () => {
        const epoch = await unirepContract.attesterCurrentEpoch(attesterId)
        const downvote = 0
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const {
            publicSignals,
            proof,
            epochKey: fromEpochKey,
            minRep,
        } = await userState.genActionProof({
            notEpochKey: toEpochKey,
            epkNonce,
            revealNonce,
        })

        const tx = await unirepSocialContract.voteSubsidy(
            upvoteValue,
            downvote,
            toEpochKey,
            publicSignals,
            proof
        )
        await expect(tx)
            .to.emit(unirepSocialContract, 'VoteSubmitted')
            .withArgs(
                epoch,
                fromEpochKey,
                toEpochKey,
                upvoteValue,
                downvote,
                minRep
            )
        userState.stop()
    })

    it('submit upvote subsidy with min rep should succeed', async () => {
        const epoch = await unirepContract.attesterCurrentEpoch(attesterId)
        const downvote = 0
        const minRep = 10
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const {
            publicSignals,
            proof,
            epochKey: fromEpochKey,
        } = await userState.genActionProof({
            notEpochKey: toEpochKey,
            epkNonce,
            revealNonce,
            minRep,
        })

        const tx = await unirepSocialContract.voteSubsidy(
            upvoteValue,
            downvote,
            toEpochKey,
            publicSignals,
            proof
        )
        await expect(tx)
            .to.emit(unirepSocialContract, 'VoteSubmitted')
            .withArgs(
                epoch,
                fromEpochKey,
                toEpochKey,
                upvoteValue,
                downvote,
                minRep
            )
        userState.stop()
    })

    it('submit upvote subsidy without revealing epoch key nonce should fail', async () => {
        const falseReveal = false
        const downvote = 0
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            notEpochKey: toEpochKey,
            epkNonce,
            revealNonce: falseReveal,
        })

        await expect(
            unirepSocialContract.voteSubsidy(
                upvoteValue,
                downvote,
                toEpochKey,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: epoch key nonce is not valid')
        userState.stop()
    })

    it('submit upvote subsidy wrong epoch key nonce should fail', async () => {
        const downvote = 0
        const wrongNonce = 2
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            notEpochKey: toEpochKey,
            epkNonce: wrongNonce,
            revealNonce,
        })

        await expect(
            unirepSocialContract.voteSubsidy(
                upvoteValue,
                downvote,
                toEpochKey,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: epoch key nonce is not valid')
        userState.stop()
    })

    it('submit vote subsidy with both upvote and downvote value should fail', async () => {
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            notEpochKey: toEpochKey,
            epkNonce,
            revealNonce,
        })

        await expect(
            unirepSocialContract.voteSubsidy(
                upvoteValue,
                downvoteValue,
                toEpochKey,
                publicSignals,
                proof
            )
        ).to.be.revertedWith(
            'Unirep Social: should only choose to upvote or to downvote'
        )
        userState.stop()
    })

    it('submit vote subsidy with 0 value should fail', async () => {
        const zeroVote = 0
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            notEpochKey: toEpochKey,
            epkNonce,
            revealNonce,
        })
        await expect(
            unirepSocialContract.voteSubsidy(
                zeroVote,
                zeroVote,
                toEpochKey,
                publicSignals,
                proof
            )
        ).to.be.revertedWith(
            'Unirep Social: should submit a positive vote value'
        )
        userState.stop()
    })

    it('submit upvote subsidy proof twice should fail', async () => {
        const downvote = 0
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            notEpochKey: toEpochKey,
            epkNonce,
            revealNonce,
        })
        await unirepSocialContract
            .voteSubsidy(
                upvoteValue,
                downvote,
                toEpochKey,
                publicSignals,
                proof
            )
            .then((t) => t.wait())
        await expect(
            unirepSocialContract.voteSubsidy(
                upvoteValue,
                downvote,
                toEpochKey,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: the proof is submitted before')
        userState.stop()
    })

    it('the receiver should successfully receive pos rep with subsidy', async () => {
        // upvote the receiver
        {
            const downvote = 0
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                id,
                attesterId
            )
            const { publicSignals, proof } = await userState.genActionProof({
                notEpochKey: toEpochKey,
                epkNonce,
                revealNonce,
            })
            await unirepSocialContract
                .voteSubsidy(
                    upvoteValue,
                    downvote,
                    toEpochKey,
                    publicSignals,
                    proof
                )
                .then((t) => t.wait())
            userState.stop()
        }

        // epoch transition
        await ethers.provider.send('evm_increaseTime', [defaultEpochLength])
        await ethers.provider.send('evm_mine', [])

        // receiver user state transition

        const userState2 = await genUserState(
            ethers.provider,
            unirepContract.address,
            receiver,
            attesterId
        )
        const toEpoch = await unirepContract.attesterCurrentEpoch(attesterId)
        const { publicSignals, proof } =
            await userState2.genUserStateTransitionProof({ toEpoch })
        await unirepContract
            .userStateTransition(publicSignals, proof)
            .then((t) => t.wait())

        // receiver prove min rep
        await userState2.waitForSync()
        const repProof = await userState2.genProveReputationProof({
            minRep: upvoteValue,
        })
        expect(repProof.proveMinRep).to.equal('1')
        expect(repProof.minRep).to.equal(upvoteValue.toString())
        expect(await repProof.verify()).to.be.true
        userState2.stop()
    })

    it('requesting too much subsidy should fail', async () => {
        const upvote = 10
        const downvote = 0
        const subsidy = await unirepSocialContract.subsidy()
        const iterations = Math.floor(subsidy.toNumber() / upvote)
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        for (let index = 0; index < iterations; index++) {
            const { publicSignals, proof } = await userState.genActionProof({
                notEpochKey: toEpochKey,
                epkNonce,
                revealNonce,
            })
            await unirepSocialContract
                .voteSubsidy(upvote, downvote, toEpochKey, publicSignals, proof)
                .then((t) => t.wait())
        }
        const { publicSignals, proof } = await userState.genActionProof({
            notEpochKey: toEpochKey,
            epkNonce,
            revealNonce,
        })
        await expect(
            unirepSocialContract.voteSubsidy(
                upvote,
                downvote,
                toEpochKey,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: requesting too much subsidy')
        userState.stop()
    })

    it('submit downvote should succeed', async () => {
        const epoch = await unirepContract.attesterCurrentEpoch(attesterId)
        const upvote = 0
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const {
            publicSignals,
            proof,
            epochKey: fromEpochKey,
        } = await userState.genActionProof({
            notEpochKey: toEpochKey,
            spentRep: upvoteValue,
        })

        const tx = await unirepSocialContract.vote(
            upvote,
            downvoteValue,
            toEpochKey,
            publicSignals,
            proof
        )
        await expect(tx)
            .to.emit(unirepSocialContract, 'VoteSubmitted')
            .withArgs(epoch, fromEpochKey, toEpochKey, upvote, downvoteValue, 0)
        userState.stop()
    })

    it('submit downvote with min rep should succeed', async () => {
        const epoch = await unirepContract.attesterCurrentEpoch(attesterId)
        const upvote = 0
        const minRep = 10
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const {
            publicSignals,
            proof,
            epochKey: fromEpochKey,
            proveMinRep,
        } = await userState.genActionProof({
            notEpochKey: toEpochKey,
            spentRep: upvoteValue,
            minRep,
        })

        const tx = await unirepSocialContract.vote(
            upvote,
            downvoteValue,
            toEpochKey,
            publicSignals,
            proof
        )
        expect(proveMinRep).to.equal('1')
        await expect(tx)
            .to.emit(unirepSocialContract, 'VoteSubmitted')
            .withArgs(
                epoch,
                fromEpochKey,
                toEpochKey,
                upvote,
                downvoteValue,
                minRep
            )
        userState.stop()
    })

    it('submit downvote with different amount of nullifiers should fail', async () => {
        const upvote = 0
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const wrongValue = downvoteValue - 2
        const { publicSignals, proof } = await userState.genActionProof({
            notEpochKey: toEpochKey,
            spentRep: wrongValue,
        })

        await expect(
            unirepSocialContract.vote(
                upvote,
                downvoteValue,
                toEpochKey,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: invalid rep nullifier')
        userState.stop()
    })

    it('submit downvote proof twice should fail', async () => {
        const downvote = 0
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const { publicSignals, proof } = await userState.genActionProof({
            notEpochKey: toEpochKey,
            spentRep: upvoteValue,
        })
        await unirepSocialContract
            .vote(upvoteValue, downvote, toEpochKey, publicSignals, proof)
            .then((t) => t.wait())
        await expect(
            unirepSocialContract.vote(
                upvoteValue,
                downvote,
                toEpochKey,
                publicSignals,
                proof
            )
        ).to.be.revertedWith('Unirep Social: the proof is submitted before')
        userState.stop()
    })

    it('the receiver should successfully receive neg rep', async () => {
        // upvote the receiver
        {
            const upvote = 0
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                id,
                attesterId
            )
            const { publicSignals, proof } = await userState.genActionProof({
                notEpochKey: toEpochKey,
                spentRep: upvoteValue,
            })
            await unirepSocialContract
                .vote(upvote, downvoteValue, toEpochKey, publicSignals, proof)
                .then((t) => t.wait())
            userState.stop()
        }

        // epoch transition
        await ethers.provider.send('evm_increaseTime', [defaultEpochLength])
        await ethers.provider.send('evm_mine', [])

        // receiver user state transition

        const userState2 = await genUserState(
            ethers.provider,
            unirepContract.address,
            receiver,
            attesterId
        )
        const toEpoch = await unirepContract.attesterCurrentEpoch(attesterId)
        const { publicSignals, proof } =
            await userState2.genUserStateTransitionProof({ toEpoch })
        await unirepContract
            .userStateTransition(publicSignals, proof)
            .then((t) => t.wait())

        // receiver prove min rep
        await userState2.waitForSync()
        const repProof = await userState2.genProveReputationProof({
            maxRep: downvoteValue,
        })
        expect(repProof.proveMaxRep).to.equal('1')
        expect(repProof.maxRep).to.equal(downvoteValue.toString())
        expect(await repProof.verify()).to.be.true
        userState2.stop()
    })

    it('submit downvote subsidy should succeed', async () => {
        const epoch = await unirepContract.attesterCurrentEpoch(attesterId)
        const upvote = 0
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const {
            publicSignals,
            proof,
            epochKey: fromEpochKey,
            minRep,
        } = await userState.genActionProof({
            notEpochKey: toEpochKey,
            epkNonce,
            revealNonce,
        })

        const tx = await unirepSocialContract.voteSubsidy(
            upvote,
            downvoteValue,
            toEpochKey,
            publicSignals,
            proof
        )
        await expect(tx)
            .to.emit(unirepSocialContract, 'VoteSubmitted')
            .withArgs(
                epoch,
                fromEpochKey,
                toEpochKey,
                upvote,
                downvoteValue,
                minRep
            )
        userState.stop()
    })

    it('submit downvote subsidy with min rep should succeed', async () => {
        const epoch = await unirepContract.attesterCurrentEpoch(attesterId)
        const upvote = 0
        const minRep = 10
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        const {
            publicSignals,
            proof,
            epochKey: fromEpochKey,
        } = await userState.genActionProof({
            notEpochKey: toEpochKey,
            epkNonce,
            revealNonce,
            minRep,
        })

        const tx = await unirepSocialContract.voteSubsidy(
            upvote,
            downvoteValue,
            toEpochKey,
            publicSignals,
            proof
        )
        await expect(tx)
            .to.emit(unirepSocialContract, 'VoteSubmitted')
            .withArgs(
                epoch,
                fromEpochKey,
                toEpochKey,
                upvote,
                downvoteValue,
                minRep
            )
        userState.stop()
    })

    it('the receiver should successfully receive neg rep with subsidy', async () => {
        // upvote the receiver
        {
            const upvote = 0
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                id,
                attesterId
            )
            const { publicSignals, proof } = await userState.genActionProof({
                notEpochKey: toEpochKey,
                epkNonce,
                revealNonce,
            })
            await unirepSocialContract
                .voteSubsidy(
                    upvote,
                    downvoteValue,
                    toEpochKey,
                    publicSignals,
                    proof
                )
                .then((t) => t.wait())
            userState.stop()
        }

        // epoch transition
        await ethers.provider.send('evm_increaseTime', [defaultEpochLength])
        await ethers.provider.send('evm_mine', [])

        // receiver user state transition

        const userState2 = await genUserState(
            ethers.provider,
            unirepContract.address,
            receiver,
            attesterId
        )
        const toEpoch = await unirepContract.attesterCurrentEpoch(attesterId)
        const { publicSignals, proof } =
            await userState2.genUserStateTransitionProof({ toEpoch })
        await unirepContract
            .userStateTransition(publicSignals, proof)
            .then((t) => t.wait())

        // receiver prove min rep
        await userState2.waitForSync()
        const repProof = await userState2.genProveReputationProof({
            maxRep: downvoteValue,
        })
        expect(repProof.proveMaxRep).to.equal('1')
        expect(repProof.maxRep).to.equal(downvoteValue.toString())
        expect(await repProof.verify()).to.be.true
        userState2.stop()
    })
})
