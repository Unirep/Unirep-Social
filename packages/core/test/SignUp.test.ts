// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { deployUnirep } from '@unirep/contracts/deploy'
import { Identity } from '@semaphore-protocol/identity'
import { deployUnirepSocial, Unirep, UnirepSocial } from '../deploy'
import { genUserState } from './utils'

describe('Signup', function () {
    this.timeout(1000000)
    let unirepContract: Unirep
    let unirepSocialContract: UnirepSocial
    let admin
    let attesterId

    before(async () => {
        const accounts = await ethers.getSigners()
        admin = accounts[0]

        unirepContract = await deployUnirep(admin)
        unirepSocialContract = await deployUnirepSocial(
            admin,
            unirepContract.address
        )
        attesterId = unirepSocialContract.address
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

    describe('User sign-ups', () => {
        it('sign up should succeed', async () => {
            for (let i = 0; i < 5; i++) {
                const id = new Identity()
                const userState = await genUserState(
                    ethers.provider,
                    unirepContract.address,
                    id,
                    attesterId
                )

                const { publicSignals, proof, epoch, identityCommitment } =
                    await userState.genUserSignUpProof()

                const tx = await unirepSocialContract
                    .connect(admin)
                    .userSignUp(publicSignals, proof)
                await expect(tx)
                    .to.emit(unirepSocialContract, 'UserSignedUp')
                    .withArgs(epoch, identityCommitment)
                const userCount = await unirepContract.attesterMemberCount(
                    attesterId
                )
                expect(userCount.toString()).to.equal((i + 1).toString())
            }
        })

        it('double sign up should fail', async () => {
            const id = new Identity()
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
            await expect(
                unirepSocialContract
                    .connect(admin)
                    .userSignUp(publicSignals, proof)
            ).to.be.revertedWithCustomError(
                unirepContract,
                `UserAlreadySignedUp`
            )
        })

        it('should fail sign up user if it is not called by admin', async () => {
            const accounts = await ethers.getSigners()
            const id = new Identity()
            const userState = await genUserState(
                ethers.provider,
                unirepContract.address,
                id,
                attesterId
            )

            const { publicSignals, proof } =
                await userState.genUserSignUpProof()

            await expect(
                unirepSocialContract
                    .connect(accounts[2])
                    .userSignUp(publicSignals, proof)
            ).to.be.rejectedWith(
                'Unirep Social: sign up should through an admin'
            )
        })
    })
})
