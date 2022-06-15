// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, BigNumberish, ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt, ZkIdentity } from '@unirep/crypto'
import {
    Circuit,
    formatProofForVerifierContract,
    verifyProof,
} from '@unirep/circuits'
import {
    computeProcessAttestationsProofHash,
    computeStartTransitionProofHash,
    deployUnirep,
    IAttestation,
} from '@unirep/contracts'
import * as config from '@unirep/circuits'
import {
    UnirepState,
    UserState,
    genUserState,
    genUnirepState,
    genEpochKey,
} from '@unirep/core'

import {
    findValidNonce,
    getTreeDepthsForTesting,
    EpochKeyProof,
    ReputationProof,
    SignUpProof,
    UserTransitionProof,
} from './utils'
import {
    defaultAirdroppedReputation,
    defaultCommentReputation,
    defaultPostReputation,
} from '../config/socialMedia'
import { deployUnirepSocial, UnirepSocial } from '../core/utils'

const DEFAULT_ATTESTING_FEE = BigNumber.from(1)

describe('Integration', function () {
    this.timeout(500000)

    let unirepState: UnirepState
    let users: UserState[] = new Array(2)
    const firstUser = 0
    const secondUser = 1
    let userIds: any[] = []
    let userCommitments: BigInt[] = []

    let unirepContract: ethers.Contract
    let unirepSocialContract: UnirepSocial
    let _treeDepths
    let unirepSocialId
    let postId

    let currentEpoch: ethers.BigNumber
    let userStateTransitionedNum: { [key: number]: ethers.BigNumber[] } = {}
    let epochKeys: { [key: string]: boolean } = {}
    let reputationProofIndex

    let accounts: ethers.Signer[]

    let duplicatedProofInputs

    let postText = 'postText'
    let commentText = 'commentText'

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        _treeDepths = getTreeDepthsForTesting('circuit')
        const _settings = {
            maxUsers: config.MAX_USERS,
            maxAttesters: config.MAX_ATTESTERS,
            numEpochKeyNoncePerEpoch: config.NUM_EPOCH_KEY_NONCE_PER_EPOCH,
            maxReputationBudget: config.MAX_REPUTATION_BUDGET,
            epochLength: config.EPOCH_LENGTH,
            attestingFee: DEFAULT_ATTESTING_FEE,
        }
        unirepContract = (await deployUnirep(
            <ethers.Wallet>accounts[0],
            _settings
        )) as any
        unirepSocialContract = await deployUnirepSocial(
            <ethers.Wallet>accounts[0],
            unirepContract.address
        )
        unirepSocialId = BigInt(
            await unirepContract.attesters(unirepSocialContract.address)
        )
    })

    describe('First epoch', () => {
        it('First user signs up', async () => {
            const id = new ZkIdentity()
            const commitment = id.genIdentityCommitment()
            userIds.push(id)
            userCommitments.push(commitment)

            const tx = await unirepSocialContract.userSignUp(
                BigNumber.from(commitment)
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)

            users[firstUser] = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser]
            )

            console.log(
                `First user signs up with commitment (${commitment}), in epoch ${users[firstUser].latestTransitionedEpoch} and GST leaf ${users[firstUser].latestGSTLeafIndex}`
            )
            console.log(
                '----------------------User State----------------------'
            )
            console.log(users[firstUser].toJSON())
            console.log(
                '------------------------------------------------------'
            )
        })
    })

    // No attestations made during first epoch
    // First user transitioned from epoch with no attestations

    describe('Second epoch', () => {
        const secondEpochEpochKeys: string[] = []
        let attestationsFromUnirepSocial: number = 0
        it('begin first epoch epoch transition', async () => {
            // Fast-forward epochLength of seconds
            await hardhatEthers.provider.send('evm_increaseTime', [
                config.EPOCH_LENGTH,
            ])
            // Begin epoch transition
            let tx = await unirepContract.beginEpochTransition()
            let receipt = await tx.wait()
            expect(receipt.status, 'Epoch transition failed').to.equal(1)
            console.log(
                `Gas cost of epoch transition): ${receipt.gasUsed.toString()}`
            )

            currentEpoch = await unirepContract.currentEpoch()
            expect(currentEpoch, 'Current epoch should be 2').to.equal(2)

            unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            console.log(
                '----------------------Unirep State----------------------'
            )
            console.log(unirepState.toJSON())
            console.log(
                '------------------------------------------------------'
            )
        })

        it('First user transition from first epoch', async () => {
            users[firstUser] = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser]
            )
            const proofIndexes: ethers.BigNumber[] = []
            const {
                startTransitionProof,
                processAttestationProofs,
                finalTransitionProof,
            } = await users[firstUser].genUserStateTransitionProofs()
            let isValid = await verifyProof(
                Circuit.startTransition,
                startTransitionProof.proof,
                startTransitionProof.publicSignals
            )
            expect(isValid, 'Verify start transition circuit off-chain failed')
                .to.be.true

            const blindedUserState = startTransitionProof.blindedUserState
            const blindedHashChain = startTransitionProof.blindedHashChain
            const globalStateTree = startTransitionProof.globalStateTreeRoot
            const proof = formatProofForVerifierContract(
                startTransitionProof.proof
            )
            let tx = await unirepSocialContract.startUserStateTransition(
                blindedUserState,
                blindedHashChain,
                globalStateTree,
                proof
            )
            let receipt = await tx.wait()
            expect(
                receipt.status,
                'Submit user state transition proof failed'
            ).to.equal(1)

            let proofNullifier = computeStartTransitionProofHash(
                blindedUserState,
                blindedHashChain,
                globalStateTree,
                proof
            )
            let proofIndex = await unirepContract.getProofIndex(proofNullifier)
            proofIndexes.push(proofIndex)

            for (let i = 0; i < processAttestationProofs.length; i++) {
                isValid = await verifyProof(
                    Circuit.processAttestations,
                    processAttestationProofs[i].proof,
                    processAttestationProofs[i].publicSignals
                )
                expect(
                    isValid,
                    'Verify process attestations circuit off-chain failed'
                ).to.be.true

                const outputBlindedUserState =
                    processAttestationProofs[i].outputBlindedUserState
                const outputBlindedHashChain =
                    processAttestationProofs[i].outputBlindedHashChain
                const inputBlindedUserState =
                    processAttestationProofs[i].inputBlindedUserState

                tx = await unirepSocialContract.processAttestations(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(
                        processAttestationProofs[i].proof
                    )
                )
                receipt = await tx.wait()
                expect(
                    receipt.status,
                    'Submit process attestations proof failed'
                ).to.equal(1)

                const proofNullifier = computeProcessAttestationsProofHash(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(
                        processAttestationProofs[i].proof
                    )
                )
                const proofIndex = await unirepContract.getProofIndex(
                    proofNullifier
                )
                proofIndexes.push(proofIndex)
            }

            const USTProof = new UserTransitionProof(
                finalTransitionProof.publicSignals,
                finalTransitionProof.proof
            )
            isValid = await USTProof.verify()
            expect(
                isValid,
                'Verify user state transition circuit off-chain failed'
            ).to.be.true

            tx = await unirepContract.updateUserStateRoot(
                USTProof,
                proofIndexes
            )
            receipt = await tx.wait()
            expect(
                receipt.status,
                'Submit user state transition proof failed'
            ).to.equal(1)
        })

        it('genUserState should match', async () => {
            const userStateFromContract = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                users[firstUser].id
            )
            console.log(
                '----------------------User State----------------------'
            )
            console.log(userStateFromContract.toJSON())
            console.log(
                '------------------------------------------------------'
            )

            expect(userStateFromContract.latestTransitionedEpoch).equal(
                currentEpoch
            )
            expect(userStateFromContract.latestGSTLeafIndex).not.equal(-1)
        })

        it('Second user signs up', async () => {
            const id = new ZkIdentity()
            const commitment = id.genIdentityCommitment()
            userIds.push(id)
            userCommitments.push(commitment)

            const tx = await unirepSocialContract.userSignUp(
                BigNumber.from(commitment)
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)

            users[secondUser] = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[secondUser]
            )

            console.log(
                `Second user signs up with commitment (${commitment}), in epoch ${users[secondUser].latestTransitionedEpoch} and GST leaf ${users[secondUser].latestGSTLeafIndex}`
            )
            console.log(
                '----------------------User State----------------------'
            )
            console.log(users[secondUser].toJSON())
            console.log(
                '------------------------------------------------------'
            )
        })

        it('first user generate an epoch key and verify it', async () => {
            const epochKeyNonce = 0
            const { publicSignals, proof } = await users[
                firstUser
            ].genVerifyEpochKeyProof(epochKeyNonce)
            const epochKeyProof = new EpochKeyProof(publicSignals, proof)
            const isValid = await epochKeyProof.verify()
            expect(isValid, 'Verify epk proof off-chain failed').to.be.true

            // Verify on-chain
            const GSTree = unirepState.genGSTree(currentEpoch.toNumber())
            const firstUserEpochKey = epochKeyProof.epochKey
            const isProofValid = await unirepContract.verifyEpochKeyValidity(
                epochKeyProof
            )
            console.log(
                `Verifying epk proof with GSTreeRoot ${GSTree.root}, epoch ${currentEpoch} and epk ${firstUserEpochKey}`
            )
            expect(isProofValid, 'Verify epk proof on-chain failed').to.be.true
        })

        it('first user publish a post and generate epoch key', async () => {
            users[firstUser] = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser]
            )
            const repNullifiersAmount = defaultPostReputation
            const epkNonce = 0
            const epochKey = genEpochKey(
                users[firstUser].id.identityNullifier,
                currentEpoch.toNumber(),
                epkNonce
            ) as BigNumberish
            const minRep = defaultAirdroppedReputation
            const proveGraffiti = BigInt(0)
            const graffitiPreImage = genRandomSalt()
            users[firstUser] = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser]
            )
            const nonceList: BigInt[] = findValidNonce(
                users[firstUser],
                repNullifiersAmount,
                currentEpoch.toNumber(),
                unirepSocialId
            )

            const { publicSignals, proof } = await users[
                firstUser
            ].genProveReputationProof(
                unirepSocialId,
                epkNonce,
                minRep,
                proveGraffiti,
                graffitiPreImage,
                nonceList
            )
            const reputationProof = new ReputationProof(publicSignals, proof)
            const isValid = await reputationProof.verify()
            expect(isValid, 'Verify reputation proof off-chain failed').to.be
                .true

            // Verify on-chain
            const isProofValid = await unirepContract.verifyReputation(
                reputationProof
            )
            expect(isProofValid, 'Verify reputation on-chain failed').to.be.true

            const tx = await unirepSocialContract.publishPost(
                postText,
                reputationProof,
                { value: DEFAULT_ATTESTING_FEE, gasLimit: 1000000 }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit post failed').to.equal(1)

            // User submit a post through Unirep Social should be found in Unirep Social Events
            const postFilter = unirepSocialContract.filters.PostSubmitted(
                currentEpoch,
                epochKey
            )
            const postEvents = await unirepSocialContract.queryFilter(
                postFilter
            )
            expect(postEvents.length).to.equal(1)

            secondEpochEpochKeys.push(epochKey.toString())
            attestationsFromUnirepSocial++
            epochKeys[epochKey.toString()] = true
            // store reputation proof index
            reputationProofIndex = await unirepContract.getProofIndex(
                reputationProof.hash()
            )
            postId = tx.hash

            console.log(
                `Attester attest to epk ${epochKey} with proof index ${reputationProofIndex.toNumber()}`
            )
        })

        it('Second user upvote to first user', async () => {
            users[secondUser] = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[secondUser]
            )
            // gen nullifier nonce list
            const upvoteValue = 3
            const repNullifiersAmount = upvoteValue
            const epkNonce = 0

            // first user's epoch key
            const firstUserEpochKey = genEpochKey(
                users[firstUser].id.identityNullifier,
                currentEpoch.toNumber(),
                epkNonce
            ) as BigNumberish
            const minRep = defaultAirdroppedReputation
            const proveGraffiti = BigInt(0)
            const graffitiPreImage = genRandomSalt()
            const nonceList: BigInt[] = findValidNonce(
                users[secondUser],
                repNullifiersAmount,
                currentEpoch.toNumber(),
                unirepSocialId
            )

            // second user's reputaiton proof
            const { publicSignals, proof, epochKey } = await users[
                secondUser
            ].genProveReputationProof(
                unirepSocialId,
                epkNonce,
                minRep,
                proveGraffiti,
                graffitiPreImage,
                nonceList
            )
            const reputationProof = new ReputationProof(publicSignals, proof)
            const isValid = await reputationProof.verify()
            expect(isValid, 'Verify reputation proof off-chain failed').to.be
                .true
            const secondUserEpochKey = BigInt(epochKey)

            // submit vote
            const tx = await unirepSocialContract.vote(
                upvoteValue,
                0,
                firstUserEpochKey,
                reputationProofIndex,
                reputationProof,
                { value: DEFAULT_ATTESTING_FEE.mul(2), gasLimit: 1000000 }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit vote failed').to.equal(1)

            // User submit a vote through Unirep Social should be found in Unirep Social Events
            const voteFilter = unirepSocialContract.filters.VoteSubmitted(
                currentEpoch,
                secondUserEpochKey,
                firstUserEpochKey
            )
            const voteEvents = await unirepSocialContract.queryFilter(
                voteFilter
            )
            expect(voteEvents.length).to.equal(1)

            secondEpochEpochKeys.push(secondUserEpochKey.toString())

            attestationsFromUnirepSocial += 2
            epochKeys[firstUserEpochKey.toString()] = true
            epochKeys[secondUserEpochKey.toString()] = true

            // compute reputation proof index
            const _reputationProofIndex = await unirepContract.getProofIndex(
                reputationProof.hash()
            )
            console.log(
                `Attester attest to epk ${firstUserEpochKey} with proof index ${_reputationProofIndex.toNumber()}`
            )
        })

        it('first user leave a comment and generate epoch key', async () => {
            users[firstUser] = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser]
            )
            const repNullifiersAmount = defaultCommentReputation
            const epkNonce = 1
            const epochKey = genEpochKey(
                users[firstUser].id.identityNullifier,
                currentEpoch.toNumber(),
                epkNonce
            ) as BigNumberish
            const minRep = defaultAirdroppedReputation
            const proveGraffiti = BigInt(0)
            const graffitiPreImage = genRandomSalt()
            const nonceList: BigInt[] = findValidNonce(
                users[firstUser],
                repNullifiersAmount,
                currentEpoch.toNumber(),
                unirepSocialId
            )

            const { publicSignals, proof } = await users[
                firstUser
            ].genProveReputationProof(
                unirepSocialId,
                epkNonce,
                minRep,
                proveGraffiti,
                graffitiPreImage,
                nonceList
            )
            const reputationProof = new ReputationProof(publicSignals, proof)
            const isValid = await reputationProof.verify()
            expect(isValid, 'Verify reputation proof off-chain failed').to.be
                .true

            // Verify on-chain
            const isProofValid = await unirepContract.verifyReputation(
                reputationProof
            )
            expect(isProofValid, 'Verify reputation on-chain failed').to.be.true

            // submit comment
            const tx = await unirepSocialContract.leaveComment(
                postId,
                commentText,
                reputationProof,
                { value: DEFAULT_ATTESTING_FEE, gasLimit: 1000000 }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit post failed').to.equal(1)

            // User submit a comment through Unirep Social should be found in Unirep Social Events
            const commentFilter = unirepSocialContract.filters.CommentSubmitted(
                currentEpoch,
                postId,
                epochKey
            )
            const commentEvents = await unirepSocialContract.queryFilter(
                commentFilter
            )
            expect(commentEvents.length).to.equal(1)

            secondEpochEpochKeys.push(epochKey.toString())
            attestationsFromUnirepSocial++
            epochKeys[epochKey.toString()] = true

            // compute reputation proof index
            const _reputationProofIndex = await unirepContract.getProofIndex(
                reputationProof.hash()
            )
            console.log(
                `Attester attest to epk ${epochKey} with proof index ${_reputationProofIndex.toNumber()}`
            )
        })

        it('First user request Unirep Social for epoch transition airdrop', async () => {
            const { publicSignals, proof } = await users[
                firstUser
            ].genUserSignUpProof(unirepSocialId)
            const signUpProof = new SignUpProof(publicSignals, proof)

            // submit epoch key
            let tx = await unirepSocialContract.airdrop(signUpProof, {
                value: DEFAULT_ATTESTING_FEE,
            })
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
            attestationsFromUnirepSocial++

            // compute reputation proof index
            const _reputationProofIndex = await unirepContract.getProofIndex(
                signUpProof.hash()
            )
            console.log(
                `Attester attest to epk ${
                    signUpProof.epochKey
                } with proof index ${_reputationProofIndex.toNumber()}`
            )
        })

        it('Attestations gathered from events should match', async () => {
            // Gen Unirep State From Contract
            unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )

            // First filter by epoch
            const attestationsByEpochFilter =
                unirepContract.filters.AttestationSubmitted(currentEpoch)
            const attestationsByEpochEvent = await unirepContract.queryFilter(
                attestationsByEpochFilter
            )
            expect(
                attestationsByEpochEvent.length,
                `Number of attestations submitted should be ${attestationsFromUnirepSocial}`
            ).to.equal(attestationsFromUnirepSocial)

            // Second filter by attester
            const attestationsByAttesterFilter =
                unirepContract.filters.AttestationSubmitted(
                    null,
                    null,
                    unirepSocialContract.address
                )
            const attestationsByAttesterEvent =
                await unirepContract.queryFilter(attestationsByAttesterFilter)
            expect(
                attestationsByAttesterEvent.length,
                `Number of attestations from Unirep Social should be ${attestationsFromUnirepSocial}`
            ).to.equal(attestationsFromUnirepSocial)

            // Last filter by epoch key
            for (let epochKey of secondEpochEpochKeys) {
                console.log('second epoch epoch keys', epochKey)
                let attestationsByEpochKeyFilter =
                    unirepContract.filters.AttestationSubmitted(
                        null,
                        BigInt(epochKey)
                    )
                let attestationsByEpochKeyEvent =
                    await unirepContract.queryFilter(
                        attestationsByEpochKeyFilter
                    )
                let attestations_: IAttestation[] =
                    attestationsByEpochKeyEvent.map(
                        (event: any) => event['args']['_attestation']
                    )

                let attestations: IAttestation[] =
                    unirepState.getAttestations(epochKey)
                expect(
                    attestationsByEpochKeyEvent.length,
                    `Number of attestations to epk ${epochKey} should be ${attestations.length}`
                ).to.equal(attestations.length)

                for (let i = 0; i < attestations_.length; i++) {
                    console.log(
                        `Comparing attestation ${i} attesting to epk ${epochKey}`
                    )
                    expect(
                        attestations[i]['attesterId'],
                        'Mismatched attesterId'
                    ).to.equal(attestations_[i]['attesterId'])
                    expect(
                        attestations[i]['posRep'],
                        'Mismatched posRep'
                    ).to.equal(attestations_[i]['posRep'])
                    expect(
                        attestations[i]['negRep'],
                        'Mismatched negRep'
                    ).to.equal(attestations_[i]['negRep'])
                    expect(
                        attestations[i]['graffiti'],
                        'Mismatched graffiti'
                    ).to.equal(attestations_[i]['graffiti'])
                    expect(
                        attestations[i]['overwriteGraffiti'],
                        'Mismatched overwriteGraffiti'
                    ).to.equal(attestations_[i]['overwriteGraffiti'])
                }
            }
        })
    })

    describe('Third epoch', () => {
        it('begin second epoch epoch transition', async () => {
            // Fast-forward epochLength of seconds
            await hardhatEthers.provider.send('evm_increaseTime', [
                config.EPOCH_LENGTH,
            ])
            // Begin epoch transition
            let tx = await unirepContract.beginEpochTransition()
            let receipt = await tx.wait()
            expect(receipt.status, 'Epoch transition failed').to.equal(1)
            console.log(
                `Gas cost of epoch transition: ${receipt.gasUsed.toString()}`
            )

            currentEpoch = await unirepContract.currentEpoch()
            expect(currentEpoch, 'Current epoch should be 3').to.equal(3)

            unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            console.log(
                '----------------------Unirep State----------------------'
            )
            console.log(unirepState.toJSON())
            console.log(
                '------------------------------------------------------'
            )

            userStateTransitionedNum[currentEpoch.toNumber()] = []
        })

        it('First user transition from second epoch', async () => {
            users[firstUser] = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser]
            )
            const proofIndexes: ethers.BigNumber[] = []
            const {
                startTransitionProof,
                processAttestationProofs,
                finalTransitionProof,
            } = await users[firstUser].genUserStateTransitionProofs()
            let isValid = await verifyProof(
                Circuit.startTransition,
                startTransitionProof.proof,
                startTransitionProof.publicSignals
            )
            expect(isValid, 'Verify start transition circuit off-chain failed')
                .to.be.true

            const blindedUserState = startTransitionProof.blindedUserState
            const blindedHashChain = startTransitionProof.blindedHashChain
            const globalStateTree = startTransitionProof.globalStateTreeRoot
            const proof = formatProofForVerifierContract(
                startTransitionProof.proof
            )
            let tx = await unirepSocialContract.startUserStateTransition(
                blindedUserState,
                blindedHashChain,
                globalStateTree,
                proof
            )
            let receipt = await tx.wait()
            expect(
                receipt.status,
                'Submit user state transition proof failed'
            ).to.equal(1)

            let proofNullifier = computeStartTransitionProofHash(
                blindedUserState,
                blindedHashChain,
                globalStateTree,
                proof
            )
            let proofIndex = await unirepContract.getProofIndex(proofNullifier)
            proofIndexes.push(proofIndex)

            for (let i = 0; i < processAttestationProofs.length; i++) {
                isValid = await verifyProof(
                    Circuit.processAttestations,
                    processAttestationProofs[i].proof,
                    processAttestationProofs[i].publicSignals
                )
                expect(
                    isValid,
                    'Verify process attestations circuit off-chain failed'
                ).to.be.true

                const outputBlindedUserState =
                    processAttestationProofs[i].outputBlindedUserState
                const outputBlindedHashChain =
                    processAttestationProofs[i].outputBlindedHashChain
                const inputBlindedUserState =
                    processAttestationProofs[i].inputBlindedUserState

                tx = await unirepSocialContract.processAttestations(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(
                        processAttestationProofs[i].proof
                    )
                )
                receipt = await tx.wait()
                expect(
                    receipt.status,
                    'Submit process attestations proof failed'
                ).to.equal(1)

                const proofNullifier = computeProcessAttestationsProofHash(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(
                        processAttestationProofs[i].proof
                    )
                )
                const proofIndex = await unirepContract.getProofIndex(
                    proofNullifier
                )
                proofIndexes.push(proofIndex)
            }

            const USTProof = new UserTransitionProof(
                finalTransitionProof.publicSignals,
                finalTransitionProof.proof
            )
            isValid = await USTProof.verify()
            expect(
                isValid,
                'Verify user state transition circuit off-chain failed'
            ).to.be.true

            tx = await unirepContract.updateUserStateRoot(
                USTProof,
                proofIndexes
            )
            receipt = await tx.wait()
            expect(
                receipt.status,
                'Submit user state transition proof failed'
            ).to.equal(1)

            // Record state transition proof inputs to be used to submit duplicated proof
            duplicatedProofInputs = {
                USTProof,
                proofIndexes,
            }
        })

        it('genUserState should match', async () => {
            const userStateFromContract = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                users[firstUser].id
            )
            console.log(
                '----------------------User State----------------------'
            )
            console.log(userStateFromContract.toJSON())
            console.log(
                '------------------------------------------------------'
            )

            expect(userStateFromContract.latestTransitionedEpoch).equal(
                currentEpoch
            )
            expect(userStateFromContract.latestGSTLeafIndex).not.equal(-1)
        })

        it('First user prove his reputation', async () => {
            const attesterId = unirepSocialId // Prove reputation received from Unirep Social
            const proveGraffiti = BigInt(0)
            const minRep = 25
            const epkNonce = 0
            const graffitiPreImage = genRandomSalt()
            users[firstUser] = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[firstUser]
            )

            console.log(
                `Proving reputation from attester ${attesterId} with minRep ${minRep} and graffitiPreimage ${graffitiPreImage}`
            )
            const { publicSignals, proof } = await users[
                firstUser
            ].genProveReputationProof(
                attesterId,
                epkNonce,
                minRep,
                proveGraffiti,
                graffitiPreImage
            )
            const reputationProof = new ReputationProof(publicSignals, proof)
            const isValid = await reputationProof.verify()
            expect(isValid, 'Verify reputation proof off-chain failed').to.be
                .true

            // Verify on-chain
            const isProofValid = await unirepContract.verifyReputation(
                reputationProof
            )
            expect(isProofValid, 'Verify reputation on-chain failed').to.be.true
        })

        it('First user submits duplicated state transition proof should fail', async () => {
            await expect(
                unirepContract.updateUserStateRoot(
                    duplicatedProofInputs.USTProof,
                    duplicatedProofInputs.proofIndexes
                )
            ).to.be.revertedWith('Unirep: the proof has been submitted before')
        })
    })
})
