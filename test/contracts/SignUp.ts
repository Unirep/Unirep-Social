import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import chai from "chai"
import { attestingFee, epochLength, epochTreeDepth, globalStateTreeDepth, numEpochKeyNoncePerEpoch, maxUsers, nullifierTreeDepth, numAttestationsPerEpochKey, userStateTreeDepth} from '../../config/testLocal'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { IncrementalQuinTree } from 'maci-crypto'
import { deployUnirep, genNewUserStateTree, getTreeDepthsForTesting } from '../utils'

const { expect } = chai

import UnirepSocial from "../../artifacts/contracts/UnirepSocial.sol/UnirepSocial.json"
import { DEFAULT_AIRDROPPED_KARMA, DEFAULT_COMMENT_KARMA, DEFAULT_POST_KARMA } from '../../config/socialMedia'
import { deployUnirepSocial } from '../../core/utils'


describe('Signup', () => {
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
        const numAttestationsPerEpochKey_ = await unirepContract.numAttestationsPerEpochKey()
        expect(numAttestationsPerEpochKey).equal(numAttestationsPerEpochKey_)
        const numEpochKeyNoncePerEpoch_ = await unirepContract.numEpochKeyNoncePerEpoch()
        expect(numEpochKeyNoncePerEpoch).equal(numEpochKeyNoncePerEpoch_)
        const numAttestationsPerEpoch_ = await unirepContract.numAttestationsPerEpoch()
        expect(numEpochKeyNoncePerEpoch * numAttestationsPerEpochKey).equal(numAttestationsPerEpoch_)
        const maxUsers_ = await unirepContract.maxUsers()
        expect(maxUsers).equal(maxUsers_)

        const treeDepths_ = await unirepContract.treeDepths()
        expect(epochTreeDepth).equal(treeDepths_.epochTreeDepth)
        expect(globalStateTreeDepth).equal(treeDepths_.globalStateTreeDepth)
        expect(nullifierTreeDepth).equal(treeDepths_.nullifierTreeDepth)
        expect(userStateTreeDepth).equal(treeDepths_.userStateTreeDepth)

        const postReputation_ = await unirepSocialContract.postReputation()
        expect(postReputation_).equal(DEFAULT_POST_KARMA)
        const commentReputation_ = await unirepSocialContract.commentReputation()
        expect(commentReputation_).equal(DEFAULT_COMMENT_KARMA)
        const airdroppedReputation_ = await unirepSocialContract.airdroppedReputation()
        expect(airdroppedReputation_).equal(DEFAULT_AIRDROPPED_KARMA)
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
                    BigInt(DEFAULT_AIRDROPPED_KARMA),
                    BigInt(0)
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
                .to.be.revertedWith('Unirep: maximum number of signups reached')
        })
    })

    describe('Attester sign-ups', () => {
        let attester
        let attesterAddress
        let attester2
        let attesterSig
        let contractCalledByAttester
        let contractCalledByAttester2

        it('sign up should succeed', async () => {
            attester = accounts[1]
            attesterAddress = await attester.getAddress()
            contractCalledByAttester = await hardhatEthers.getContractAt(UnirepSocial.abi, unirepSocialContract.address, attester)
            const message = ethers.utils.solidityKeccak256(["address", "address"], [attesterAddress, unirepContract.address])
            attesterSig = await attester.signMessage(ethers.utils.arrayify(message))
            const tx = await contractCalledByAttester.attesterSignUp(attesterSig)
            const receipt = await tx.wait()

            expect(receipt.status).equal(1)

            const attesterId = await unirepContract.attesters(attesterAddress)
            // attesterId 1 is the Unirep Social contract so it starts from 2
            expect(2).equal(attesterId)
            const nextAttesterId_ = await unirepContract.nextAttesterId()
            // nextAttesterId starts with 1 after Unirep Social and attester sign up it should be 2
            expect(3).equal(nextAttesterId_)
        })

        it('sign up with invalid signature should fail', async () => {
            attester2 = accounts[2]
            contractCalledByAttester2 = await hardhatEthers.getContractAt(UnirepSocial.abi, unirepSocialContract.address, attester2)
            await expect(contractCalledByAttester2.attesterSignUp(attesterSig))
                .to.be.revertedWith('Unirep: invalid attester sign up signature')
        })

        it('double sign up should fail', async () => {
            await expect(contractCalledByAttester.attesterSignUp(attesterSig))
                .to.be.revertedWith('Unirep: attester has already signed up')
        })
    })
})