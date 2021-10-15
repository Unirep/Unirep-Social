import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import { expect } from 'chai'
import { attestingFee, epochLength, epochTreeDepth, globalStateTreeDepth, numEpochKeyNoncePerEpoch, maxUsers, userStateTreeDepth } from '@unirep/unirep'
import { deployUnirep } from '@unirep/contracts'
import { genIdentity, genIdentityCommitment, IncrementalQuinTree } from '@unirep/crypto'

import { genNewUserStateTree, getTreeDepthsForTesting } from '../utils'
import { defaultAirdroppedReputation, defaultCommentReputation, defaultPostReputation } from '../../config/socialMedia'
import { deployUnirepSocial } from '../../core/utils'


describe('Signup', function () {
    this.timeout(1000000)
    let unirepContract
    let unirepSocialContract
    let GSTree
    let emptyUserStateRoot
    
    let accounts: ethers.Signer[]
    
    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting("contract")
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths)
        unirepSocialContract = await deployUnirepSocial(<ethers.Wallet>accounts[0], unirepContract.address)

        const blankGSLeaf = await unirepContract.hashedBlankStateLeaf()
        GSTree = new IncrementalQuinTree(globalStateTreeDepth, blankGSLeaf, 2)
    })

    it('should have the correct config value', async () => {
        const attestingFee_ = await unirepContract.attestingFee()
        expect(attestingFee).equal(attestingFee_)
        const epochLength_ = await unirepContract.epochLength()
        expect(epochLength).equal(epochLength_)
        const numEpochKeyNoncePerEpoch_ = await unirepContract.numEpochKeyNoncePerEpoch()
        expect(numEpochKeyNoncePerEpoch).equal(numEpochKeyNoncePerEpoch_)
        const maxUsers_ = await unirepContract.maxUsers()
        expect(maxUsers).equal(maxUsers_)

        const treeDepths_ = await unirepContract.treeDepths()
        expect(epochTreeDepth).equal(treeDepths_.epochTreeDepth)
        expect(globalStateTreeDepth).equal(treeDepths_.globalStateTreeDepth)
        expect(userStateTreeDepth).equal(treeDepths_.userStateTreeDepth)

        const postReputation_ = await unirepSocialContract.postReputation()
        expect(postReputation_).equal(defaultPostReputation)
        const commentReputation_ = await unirepSocialContract.commentReputation()
        expect(commentReputation_).equal(defaultCommentReputation)
        const airdroppedReputation_ = await unirepSocialContract.airdroppedReputation()
        expect(airdroppedReputation_).equal(defaultAirdroppedReputation)
        const unirepAddress_ = await unirepSocialContract.unirep()
        expect(unirepAddress_).equal(unirepContract.address)
        const unirepSocialAttesterId = await unirepContract.attesters(unirepSocialContract.address)
        expect(unirepSocialAttesterId.toNumber()).equal(1)
    })

    it('should have the correct default value', async () => {
        const emptyUSTree = await genNewUserStateTree()
        emptyUserStateRoot = await unirepContract.emptyUserStateRoot()
        expect(BigNumber.from(emptyUSTree.getRootHash())).equal(emptyUserStateRoot)

        const emptyGlobalStateTreeRoot = await unirepContract.emptyGlobalStateTreeRoot()
        expect(BigNumber.from(GSTree.root)).equal(emptyGlobalStateTreeRoot)
    })

    describe('User sign-ups', () => {
        const id = genIdentity()
        const commitment = genIdentityCommitment(id)

        it('sign up should succeed', async () => {
            const tx = await unirepSocialContract.userSignUp(commitment)
            const receipt = await tx.wait()

            expect(receipt.status).equal(1)

            const numUserSignUps_ = await unirepContract.numUserSignUps()
            expect(1).equal(numUserSignUps_)

            const hashedStateLeaf = await unirepContract.hashStateLeaf(
                [
                    commitment,
                    emptyUserStateRoot,
                ]
            )
            GSTree.insert(hashedStateLeaf)
        })

        it('double sign up should fail', async () => {
            await expect(unirepSocialContract.userSignUp(commitment))
                .to.be.revertedWith('Unirep: the user has already signed up')
        })

        it('sign up should fail if max capacity reached', async () => {
            for (let i = 1; i < maxUsers; i++) {
                let tx = await unirepSocialContract.userSignUp(
                    genIdentityCommitment(genIdentity())
                )
                let receipt = await tx.wait()
                expect(receipt.status).equal(1)
            }
            await expect(unirepSocialContract.userSignUp(genIdentityCommitment(genIdentity())))
                .to.be.revertedWith('Unirep: maximum number of user signups reached')
        })
    })
})