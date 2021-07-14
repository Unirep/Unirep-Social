import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import chai from "chai"
import { attestingFee, epochLength, circuitEpochTreeDepth, circuitGlobalStateTreeDepth, numEpochKeyNoncePerEpoch, maxUsers, circuitNullifierTreeDepth, numAttestationsPerEpochKey, circuitUserStateTreeDepth} from '../../config/testLocal'
import { UnirepState } from '../../database/UnirepState'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { IncrementalQuinTree } from 'maci-crypto'
import { deployUnirep, genNewUserStateTree, getTreeDepthsForTesting } from '../utils'
import { deployUnirepSocial } from '../../core/utils'

const { expect } = chai

import Unirep from "../../artifacts/contracts/Unirep.sol/Unirep.json"
import { DEFAULT_AIRDROPPED_KARMA, DEFAULT_COMMENT_KARMA, DEFAULT_POST_KARMA } from '../../config/socialMedia'
import { genGSTreeFromDB, updateDBFromEpochEndedEvent, updateDBFromNewGSTLeafInsertedEvent } from '../../database/utils'
import { dbTestUri, dbUri } from '../../config/database'
import GSTLeaves, { IGSTLeaves } from '../../database/models/GSTLeaf'
import { add0x } from '../../crypto/SMT'
import UserSignUp, { IUserSignUp } from '../../database/models/userSignUp'
import Settings, { ISettings } from '../../database/models/settings'


describe('User Sign Up', function () {
    let unirepContract
    let unirepSocialContract
    let GSTree
    let emptyUserStateRoot
    let unirepState
    
    let accounts: ethers.Signer[]
    let db
    let numUserSignUps: number = 0
    const numUserSignUpInEpochOne: number = Math.floor(Math.random() * (maxUsers / 2))
    const numUserSignUpInEpochTwo: number = Math.floor(Math.random() * (maxUsers / 2))

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting('circuit')
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths)
        unirepSocialContract = await deployUnirepSocial(<ethers.Wallet>accounts[0], unirepContract.address)

        const blankGSLeaf = await unirepContract.hashedBlankStateLeaf()
        GSTree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)

        unirepState = new UnirepState(dbUri)

        await unirepState.connectDB()
        await unirepState.initDB()
    })

    after(async() => {
        unirepState.disconnectDB()
    })

    it('should save settings is database', async () => {
        await unirepState.saveSettings(unirepContract)
        const _settings: ISettings | null = await Settings.findOne()
        expect(_settings).not.equal(null)
    })

    it('should have the correct config value', async () => {
        const _settings: ISettings | null = await Settings.findOne()
        const attestingFee_ = await unirepContract.attestingFee()
        expect(attestingFee).equal(attestingFee_)
        expect(_settings?.attestingFee).equal(attestingFee_)
        const epochLength_ = await unirepContract.epochLength()
        expect(epochLength).equal(epochLength_)
        expect(_settings?.epochLength).equal(epochLength_)
        const numAttestationsPerEpochKey_ = await unirepContract.numAttestationsPerEpochKey()
        expect(numAttestationsPerEpochKey).equal(numAttestationsPerEpochKey_)
        expect(_settings?.numAttestationsPerEpochKey).equal(numAttestationsPerEpochKey_)
        const numEpochKeyNoncePerEpoch_ = await unirepContract.numEpochKeyNoncePerEpoch()
        expect(numEpochKeyNoncePerEpoch).equal(numEpochKeyNoncePerEpoch_)
        expect(_settings?.numEpochKeyNoncePerEpoch).equal(numEpochKeyNoncePerEpoch_)
        const numAttestationsPerEpoch_ = await unirepContract.numAttestationsPerEpoch()
        expect(numEpochKeyNoncePerEpoch * numAttestationsPerEpochKey).equal(numAttestationsPerEpoch_)
        expect(_settings?.numAttestationsPerEpochKey).equal(numAttestationsPerEpochKey)
        const maxUsers_ = await unirepContract.maxUsers()
        expect(maxUsers).equal(maxUsers_)

        const treeDepths_ = await unirepContract.treeDepths()
        expect(circuitEpochTreeDepth).equal(treeDepths_.epochTreeDepth)
        expect(circuitGlobalStateTreeDepth).equal(treeDepths_.globalStateTreeDepth)
        expect(circuitNullifierTreeDepth).equal(treeDepths_.nullifierTreeDepth)
        expect(circuitUserStateTreeDepth).equal(treeDepths_.userStateTreeDepth)

        const postReputation_ = await unirepSocialContract.postReputation()
        expect(postReputation_).equal(DEFAULT_POST_KARMA)
        const commentReputation_ = await unirepSocialContract.commentReputation()
        expect(commentReputation_).equal(DEFAULT_COMMENT_KARMA)
        const airdroppedReputation_ = await unirepSocialContract.airdroppedReputation()
        expect(airdroppedReputation_).equal(DEFAULT_AIRDROPPED_KARMA)
        const unirepAddress_ = await unirepSocialContract.unirep()
        expect(unirepAddress_).equal(unirepContract.address)
    })

    it('should have the correct default value', async () => {
        const emptyUSTree = await genNewUserStateTree()
        emptyUserStateRoot = await unirepContract.emptyUserStateRoot()
        expect(BigNumber.from(emptyUSTree.getRootHash())).equal(emptyUserStateRoot)

        const emptyGlobalStateTreeRoot = await unirepContract.emptyGlobalStateTreeRoot()
        expect(BigNumber.from(GSTree.root)).equal(emptyGlobalStateTreeRoot)

        const _settings: ISettings | null = await Settings.findOne()
        const blankGSLeaf = await unirepContract.hashedBlankStateLeaf()
        expect(BigNumber.from(_settings?.defaultGSTLeaf)).equal(blankGSLeaf)
    })

    describe('User sign-ups epoch 1', () => {

        let currentEpoch
        let GSTreeLeafIndex: number = -1

        it('sign up should succeed', async () => {
            currentEpoch = await unirepContract.currentEpoch()
            for (let i = 0; i < numUserSignUpInEpochOne; i++) {
                const id = genIdentity()
                const commitment = genIdentityCommitment(id)
                const tx = await unirepSocialContract.userSignUp(commitment)
                const receipt = await tx.wait()

                expect(receipt.status).equal(1)
                numUserSignUps ++

                const numUserSignUps_ = await unirepContract.numUserSignUps()
                expect(numUserSignUps).equal(numUserSignUps_)

                const hashedStateLeaf = await unirepContract.hashStateLeaf(
                    [
                        commitment,
                        emptyUserStateRoot,
                        BigInt(DEFAULT_AIRDROPPED_KARMA),
                        BigInt(0)
                    ]
                )
                GSTree.insert(hashedStateLeaf)

                // unirepState.signUp(currentEpoch.toNumber(), BigInt(hashedStateLeaf))

                const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
                const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
                

                for (let j = 0; j < newLeafEvents.length; j++) {
                    if(BigInt(newLeafEvents[j]?.args?._hashedLeaf) == BigInt(hashedStateLeaf)){
                        GSTreeLeafIndex = newLeafEvents[j]?.args?._leafIndex.toNumber()
                    }
                }
                expect(GSTreeLeafIndex).to.equal(i)
            }
        })

        it('Sign up event should be emitted and stored correctly', async () => {
            const NewGSTLeafInsertedFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newGSTLeafInsertedEvents =  await unirepContract.queryFilter(NewGSTLeafInsertedFilter)
            expect(newGSTLeafInsertedEvents.length).to.equal(numUserSignUpInEpochOne)
            const iface = new ethers.utils.Interface(Unirep.abi)

            for (let event of newGSTLeafInsertedEvents) {
                await updateDBFromNewGSTLeafInsertedEvent(event)

                const decodedData = iface.decodeEventLog("NewGSTLeafInserted",event.data)

                const _transactionHash = event.transactionHash
                const _epoch = Number(event?.topics[1])
                const _hashedLeaf = add0x(decodedData?._hashedLeaf._hex)
                const _leafIndex = decodedData?._leafIndex

                const treeLeaves: IGSTLeaves | null = await GSTLeaves.findOne({
                    epoch: _epoch
                })
                expect(treeLeaves, 'Storing sign up event failed').not.equal(null)
                expect(treeLeaves?.GSTLeaves[_leafIndex].hashedLeaf).to.equal(_hashedLeaf)
                expect(treeLeaves?.GSTLeaves[_leafIndex].transactionHash).to.equal(_transactionHash)

                const signedUpUsers: IUserSignUp[] | null = await UserSignUp.find({
                    transactionHash: _transactionHash,
                    hashedLeaf: _hashedLeaf,
                    epoch: _epoch
                })

                expect(signedUpUsers.length, 'Storing signed up user failed').to.equal(1)
            }
        })

        it('Generate global state tree from database should success', async() => {
            const GSTRootFromDB = (await unirepState.genGSTree(currentEpoch)).root
            const GSTRoot = GSTree.root
            expect(GSTRootFromDB.toString(), 'GST root mismatch').to.equal(GSTRoot.toString())
        })
    })

    describe('User sign-ups epoch 2', () => {

        let prevEpoch
        let currentEpoch
        let GSTreeLeafIndex: number = -1

        it('should transition to epoch 2', async () => {
            currentEpoch = await unirepContract.currentEpoch()
            prevEpoch = currentEpoch
            let numEpochKey = await unirepContract.getNumEpochKey(currentEpoch)
            await hardhatEthers.provider.send("evm_increaseTime", [epochLength])  // Fast-forward epochLength of seconds
            const tx = await unirepSocialContract.beginEpochTransition(numEpochKey)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
            currentEpoch = await unirepContract.currentEpoch()
            expect(currentEpoch).to.equal(2)
            // unirepState.epochTransition(prevEpoch.toNumber(), [])

            const epochEndedFilter = unirepContract.filters.EpochEnded()
            const epochEndedEvents =  await unirepContract.queryFilter(epochEndedFilter)
            await updateDBFromEpochEndedEvent(epochEndedEvents[0], unirepContract)
            
            const blankGSLeaf = await unirepContract.hashedBlankStateLeaf()
            GSTree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)
        })

        it('sign up should succeed', async () => {
            for (let i = 0; i < numUserSignUpInEpochTwo; i++) {
                const id = genIdentity()
                const commitment = genIdentityCommitment(id)
                const tx = await unirepSocialContract.userSignUp(commitment)
                const receipt = await tx.wait()

                expect(receipt.status).equal(1)
                numUserSignUps ++

                const numUserSignUps_ = await unirepContract.numUserSignUps()
                expect(numUserSignUps).equal(numUserSignUps_)

                const hashedStateLeaf = await unirepContract.hashStateLeaf(
                    [
                        commitment,
                        emptyUserStateRoot,
                        BigInt(DEFAULT_AIRDROPPED_KARMA),
                        BigInt(0)
                    ]
                )
                GSTree.insert(hashedStateLeaf)

                // unirepState.signUp(currentEpoch.toNumber(), BigInt(hashedStateLeaf))

                const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
                const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
                

                for (let j = 0; j < newLeafEvents.length; j++) {
                    if(BigInt(newLeafEvents[j]?.args?._hashedLeaf) == BigInt(hashedStateLeaf)){
                        GSTreeLeafIndex = newLeafEvents[j]?.args?._leafIndex.toNumber()
                    }
                }
                expect(GSTreeLeafIndex).to.equal(i)
            }
        })

        it('Sign up event should be emitted and stored correctly', async () => {
            const NewGSTLeafInsertedFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newGSTLeafInsertedEvents =  await unirepContract.queryFilter(NewGSTLeafInsertedFilter)
            expect(newGSTLeafInsertedEvents.length).to.equal(numUserSignUpInEpochTwo)
            const iface = new ethers.utils.Interface(Unirep.abi)

            for (let event of newGSTLeafInsertedEvents) {
                await updateDBFromNewGSTLeafInsertedEvent(event)

                const decodedData = iface.decodeEventLog("NewGSTLeafInserted",event.data)

                const _transactionHash = event.transactionHash
                const _epoch = Number(event?.topics[1])
                const _hashedLeaf = add0x(decodedData?._hashedLeaf._hex)
                const _leafIndex = decodedData?._leafIndex

                const treeLeaves: IGSTLeaves | null = await GSTLeaves.findOne({
                    epoch: _epoch
                })
                expect(treeLeaves, 'Storing sign up event failed').not.equal(null)
                expect(treeLeaves?.GSTLeaves[_leafIndex].hashedLeaf).to.equal(_hashedLeaf)
                expect(treeLeaves?.GSTLeaves[_leafIndex].transactionHash).to.equal(_transactionHash)

                const signedUpUsers: IUserSignUp[] | null = await UserSignUp.find({
                    transactionHash: _transactionHash,
                    hashedLeaf: _hashedLeaf,
                    epoch: _epoch
                })

                expect(signedUpUsers.length, 'Storing signed up user failed').to.equal(1)
            }
        })

        it('Generate global state tree from database should success', async() => {
            const GSTRootFromDB = (await unirepState.genGSTree(currentEpoch)).root
            const GSTRoot = GSTree.root
            expect(GSTRootFromDB.toString(), 'GST root mismatch').to.equal(GSTRoot.toString())
        })
    })
})