import mongoose from 'mongoose'
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import chai from "chai"
import { attestingFee, epochLength, circuitEpochTreeDepth, circuitGlobalStateTreeDepth, numEpochKeyNoncePerEpoch, maxUsers, circuitNullifierTreeDepth, numAttestationsPerEpochKey, circuitUserStateTreeDepth} from '../../config/testLocal'
import { UnirepState } from '../../database/UnirepState'
import { UserState } from '../../database/UserState'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { genRandomSalt, hash5, IncrementalQuinTree, stringifyBigInts } from 'maci-crypto'
import { deployUnirep, genEpochKey, genNewUserStateTree, getTreeDepthsForTesting } from '../utils'
import { deployUnirepSocial } from '../../core/utils'

const { expect } = chai

import Unirep from "../../artifacts/contracts/Unirep.sol/Unirep.json"
import { DEFAULT_AIRDROPPED_KARMA, DEFAULT_COMMENT_KARMA, DEFAULT_POST_KARMA, MAX_KARMA_BUDGET } from '../../config/socialMedia'
import { dbTestUri } from '../../config/database'
import GSTLeaves, { IGSTLeaf, IGSTLeaves } from '../../database/models/GSTLeaf'
import { add0x } from '../../crypto/SMT'
import UserSignUp, { IUserSignUp } from '../../database/models/userSignUp'
import Settings, { ISettings } from '../../database/models/settings'
import Post from '../../database/models/post'
import { formatProofForVerifierContract, genVerifyReputationProofAndPublicSignals, getSignalByNameViaSym, verifyProveReputationProof } from '../circuits/utils'
import { updateDBFromPostSubmittedEvent } from '../../database/utils'


describe('Post', function () {
    let unirepContract
    let unirepSocialContract
    let GSTree
    let emptyUserStateRoot
    let unirepState: UnirepState
    let users: UserState[] = []
    
    let ids: any[] = []
    let accounts: ethers.Signer[]
    let db
    let numUserSignUps: number = 0
    const numUserSignUpInEpochOne: number = 2
    const numUserSignUpInEpochTwo: number = 2
    let proof
    let nullifiers
    let publicSignals
    let epochKey
    let postId = genRandomSalt()
    let text = 'postTest'

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting('circuit')
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths)
        unirepSocialContract = await deployUnirepSocial(<ethers.Wallet>accounts[0], unirepContract.address)

        const blankGSLeaf = await unirepContract.hashedBlankStateLeaf()
        GSTree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)

        unirepState = new UnirepState(dbTestUri)

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

    describe('Epoch 1', () => {

        let currentEpoch
        let GSTreeLeafIndex: number = -1

        it(`sign up ${numUserSignUpInEpochOne} users should succeed`, async () => {
            currentEpoch = await unirepContract.currentEpoch()
            for (let i = 0; i < numUserSignUpInEpochOne; i++) {
                ids.push(genIdentity())
                const commitment = genIdentityCommitment(ids[i])
                const user = new UserState(ids[i], unirepState)
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

                const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
                const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)

                for (let j = 0; j < newLeafEvents.length; j++) {
                    if(BigInt(newLeafEvents[j]?.args?._hashedLeaf) == BigInt(hashedStateLeaf)){
                        const event = newLeafEvents[j]
                        GSTreeLeafIndex = event?.args?._leafIndex.toNumber()
                        user.signUp(event)
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
                // save user sign up event
                await unirepState.userSignUp(event)

                const decodedData = iface.decodeEventLog("NewGSTLeafInserted",event.data)

                const _transactionHash = event.transactionHash
                const _epoch = Number(event?.topics[1])
                const _hashedLeaf = add0x(decodedData?._hashedLeaf._hex)
                const _leafIndex = decodedData?._leafIndex

                // check if leaf can be found in database
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

        it('User login should generate correct user state', async() => {
            const userId = 0
            const user = new UserState(ids[userId], unirepState)
            const userState = await user.login()
            for(let epoch in userState){
                if(epoch == currentEpoch){
                    expect(userState[epoch].transitionedPosRep).to.equal(BigInt(DEFAULT_AIRDROPPED_KARMA))
                    expect(userState[epoch].transitionedNegRep).to.equal(BigInt(0))
                    const commitment = genIdentityCommitment(ids[userId])
                    const GSTLeaf = hash5([
                        commitment,
                        emptyUserStateRoot,
                        BigInt(DEFAULT_AIRDROPPED_KARMA),
                        BigInt(0),
                        BigInt(0)
                    ])
                    expect(userState[epoch].GSTLeaf).to.equal(add0x(GSTLeaf.toString(16)))
                }
            }
        })

        it('User generate reputation proof from database should succeed', async() => {
            const userId = 0
            const nonce = 0
            const minRep = 0
            const user = new UserState(ids[userId], unirepState)
            const circuitInputs = await user.genProveReputationCircuitInputs(nonce, DEFAULT_POST_KARMA, minRep)
            
            const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
            proof = results['proof']
            nullifiers = results['publicSignals'].slice(0, MAX_KARMA_BUDGET)
            publicSignals = results['publicSignals'].slice(MAX_KARMA_BUDGET+2)
            epochKey = genEpochKey(ids[userId].identityNullifier, currentEpoch, nonce)
            const isValid = await verifyProveReputationProof(proof, results['publicSignals'])
            expect(isValid, "proof is not valid").to.be.true
        })

        it('User should publish a post and the event should be stored in database sucessfully', async () => {
            const tx = await unirepSocialContract.publishPost(
                postId, 
                epochKey,
                text, 
                nullifiers,
                publicSignals, 
                formatProofForVerifierContract(proof),
                { value: attestingFee, gasLimit: 1000000 }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit post failed').to.equal(1)

            const postSubmittedFilter = unirepSocialContract.filters.PostSubmitted()
            const postSubmittedEvents =  await unirepSocialContract.queryFilter(postSubmittedFilter)

            // save post
            await updateDBFromPostSubmittedEvent(postSubmittedEvents[0])

            // find post
            const eventPostId = mongoose.Types.ObjectId(postSubmittedEvents[0].topics[2].slice(-24))
            const findPost = await Post.findById(eventPostId)
            expect(findPost).not.equal(null)
            expect(findPost?.content).to.equal(text)
            expect(findPost?.epochKey).to.equal(epochKey.toString(16))
        }) 
    })
})