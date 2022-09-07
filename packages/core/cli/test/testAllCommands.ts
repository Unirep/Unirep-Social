// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import base64url from 'base64url'
import { ethers } from 'ethers'
import { ZkIdentity, hashOne } from '@unirep/crypto'
import { getUnirepContract } from '@unirep/contracts'
import { expect } from 'chai'

import { DEFAULT_ETH_PROVIDER } from '../../cli/defaults'
import { UserState } from '@unirep/core'
import { exec, genUnirepState } from './utils'

import { identityCommitmentPrefix, identityPrefix } from '../prefix'
import { getProvider } from '../utils'
import { UnirepSocialFactory } from '../../src/utils'

describe('test all CLI subcommands', function () {
    this.timeout(500000)

    let deployerPrivKey
    let deployerAddr
    let attesterPrivKey
    let attesterAddr
    let userPrivKey
    let userAddr

    const startBlock = 0
    const attestingFee = ethers.BigNumber.from(10).pow(18)
    const epochKeyNonce = 0
    const epochKeyNonce2 = 1
    const epochLength = 5
    let unirepContract: ethers.Contract
    let unirepSocialContract: ethers.Contract
    let unirepState: UserState

    let userIdentity1,
        userIdentityCommitment1,
        userIdentity2,
        userIdentityCommitment2
    const attesterId = 2
    let epk, epkProof, epkPublicSignals
    const text = 'postText'
    const text2 = 'commentText'
    const posRep = 3,
        negRep = 8,
        graffitiPreimage = 0,
        graffiti = hashOne(BigInt(graffitiPreimage))
    const minPosRep = 0,
        maxNegRep = 10,
        minRepDiff = 15
    let userRepProof, repPublicSignals
    let airdropProof, airdropPublicSignals
    let proofIdx

    before(async () => {
        deployerPrivKey = ethers.utils.solidityKeccak256(['uint'], [0])
        deployerAddr = ethers.utils.computeAddress(deployerPrivKey)
        userPrivKey = ethers.utils.solidityKeccak256(['uint'], [1])
        userAddr = ethers.utils.computeAddress(userPrivKey)
        attesterPrivKey = ethers.utils.solidityKeccak256(['uint'], [2])
        attesterAddr = ethers.utils.computeAddress(attesterPrivKey)

        // Transfer ether so they can execute transactions
        const defaultAccount: ethers.Signer = (
            await hardhatEthers.getSigners()
        )[0]
        await defaultAccount.sendTransaction({
            to: deployerAddr,
            value: ethers.utils.parseEther('10'),
            gasLimit: 21000,
        })
        await defaultAccount.sendTransaction({
            to: userAddr,
            value: ethers.utils.parseEther('10'),
            gasLimit: 21000,
        })
        await defaultAccount.sendTransaction({
            to: attesterAddr,
            value: ethers.utils.parseEther('10'),
            gasLimit: 21000,
        })
    })

    describe('deploy CLI subcommand', () => {
        it('should deploy a Unirep contract', async () => {
            const command =
                `npx ts-node cli/index.ts deploy` +
                ` -d ${deployerPrivKey} ` +
                ` -l ${epochLength} ` +
                ` -f ${attestingFee.toString()} ` +
                ` -a 30`

            console.log(command)
            const { stdout, stderr } = exec(command)
            console.log(stdout.trim(), stderr.trim())

            const unirepRegMatch = stdout
                .trim()
                .match(/Unirep: (0x[a-fA-F0-9]{40})/) as any
            const socialRegMatch = stdout
                .trim()
                .match(/Unirep Social: (0x[a-fA-F0-9]{40})$/) as any
            const unirepAddress = unirepRegMatch[1]
            const unirepSocialAddress = socialRegMatch[1]

            const provider = getProvider(DEFAULT_ETH_PROVIDER)
            unirepContract = getUnirepContract(unirepAddress, provider)

            unirepSocialContract = UnirepSocialFactory.connect(
                unirepSocialAddress,
                provider
            )

            unirepState = await genUnirepState(
                provider,
                unirepAddress
                // startBlock,
            )

            // expect(unirepState.epochLength).equal(epochLength)
            // expect(unirepState.attestingFee).equal(attestingFee)

            const unirepSocialAttesterId = await unirepContract.attesters(
                unirepSocialContract.address
            )
            expect(unirepSocialAttesterId.toNumber()).equal(1)
        })
    })

    describe('genUserIdentity CLI subcommand', () => {
        it('should generate an identity for user 1', async () => {
            const command = `npx ts-node cli/index.ts genUnirepIdentity`

            console.log(command)
            const { stdout, stderr } = exec(command)
            console.log(stdout.trim(), stderr.trim())

            const idRegMatch = stdout
                .trim()
                .match(/^(Unirep.identity.[a-zA-Z0-9\-\_]+)\n/) as any
            const encodedIdentity = idRegMatch[1]
            const serializedIdentity = base64url.decode(
                encodedIdentity.slice(identityPrefix.length)
            )
            const _userIdentity = new ZkIdentity(2, serializedIdentity)

            const commitmentRegMatch = stdout
                .trim()
                .match(/(Unirep.identityCommitment.[a-zA-Z0-9\-\_]+)$/) as any
            const encodedIdentityCommitment = commitmentRegMatch[1]
            const serializedIdentityCommitment = base64url.decode(
                encodedIdentityCommitment.slice(identityCommitmentPrefix.length)
            )
            const _userIdentityCommitment =
                _userIdentity.genIdentityCommitment()
            expect(serializedIdentityCommitment).equal(
                _userIdentityCommitment.toString(16)
            )

            userIdentity1 = encodedIdentity
            userIdentityCommitment1 = encodedIdentityCommitment
        })
        it('should generate an identity for user 2', async () => {
            const command = `npx ts-node cli/index.ts genUnirepIdentity`

            console.log(command)
            const { stdout, stderr } = exec(command)
            console.log(stdout.trim(), stderr.trim())

            const idRegMatch = stdout
                .trim()
                .match(/^(Unirep.identity.[a-zA-Z0-9\-\_]+)\n/) as any
            const encodedIdentity = idRegMatch[1]
            const serializedIdentity = base64url.decode(
                encodedIdentity.slice(identityPrefix.length)
            )
            const _userIdentity = new ZkIdentity(2, serializedIdentity)

            const commitmentRegMatch = stdout
                .trim()
                .match(/(Unirep.identityCommitment.[a-zA-Z0-9\-\_]+)$/) as any
            const encodedIdentityCommitment = commitmentRegMatch[1]
            const serializedIdentityCommitment = base64url.decode(
                encodedIdentityCommitment.slice(identityCommitmentPrefix.length)
            )
            const _userIdentityCommitment =
                _userIdentity.genIdentityCommitment()
            expect(serializedIdentityCommitment).equal(
                _userIdentityCommitment.toString(16)
            )

            userIdentity2 = encodedIdentity
            userIdentityCommitment2 = encodedIdentityCommitment
        })
    })

    describe('userSignup CLI subcommand', () => {
        it('should sign user 1 up', async () => {
            const command =
                `npx ts-node cli/index.ts userSignUp` +
                ` -x ${unirepSocialContract.address} ` +
                ` -c ${userIdentityCommitment1} ` +
                ` -d ${deployerPrivKey} `

            console.log(command)
            const { stdout, stderr } = exec(command)
            console.log(stdout.trim(), stderr.trim())

            const signUpRegMatch = stdout
                .trim()
                .match(/Sign up epoch: 1/) as any
            expect(signUpRegMatch).not.equal(null)
        })

        it('should sign user 2 up', async () => {
            const command =
                `npx ts-node cli/index.ts userSignUp` +
                ` -x ${unirepSocialContract.address} ` +
                ` -c ${userIdentityCommitment2} ` +
                ` -d ${deployerPrivKey} `

            console.log(command)
            const { stdout, stderr } = exec(command)
            console.log(stdout.trim(), stderr.trim())

            const signUpRegMatch = stdout
                .trim()
                .match(/Sign up epoch: 1/) as any
            expect(signUpRegMatch).not.equal(null)
        })
    })

    describe('genEpochKeyAndProof CLI subcommand', () => {
        it('should generate epoch key proof', async () => {
            const command =
                `npx ts-node cli/index.ts genEpochKeyAndProof` +
                ` -x ${unirepSocialContract.address} ` +
                ` -id ${userIdentity1} ` +
                ` -n ${epochKeyNonce} `

            console.log(command)
            const { stdout, stderr } = exec(command)
            console.log(stdout.trim(), stderr.trim())

            const epkRegMatch = stdout
                .trim()
                .match(
                    /Epoch key of epoch 1 and nonce 0: ([a-fA-F0-9]+)/
                ) as any
            epk = epkRegMatch[1]
            const epkProofRegMatch = stdout
                .trim()
                .match(/(Unirep.epk.proof.[a-zA-Z0-9\-\_]+)/) as any
            epkProof = epkProofRegMatch[1]
            const epkPublicSignalsRegMatch = stdout
                .trim()
                .match(/(Unirep.epk.publicSignals.[a-zA-Z0-9\-\_]+)$/) as any
            epkPublicSignals = epkPublicSignalsRegMatch[1]
        })
    })

    describe('verifyEpochKeyProof CLI subcommand', () => {
        it('should verify epoch key proof', async () => {
            const command =
                `npx ts-node cli/index.ts verifyEpochKeyProof` +
                ` -x ${unirepSocialContract.address} ` +
                ` -pf ${epkProof} ` +
                ` -p ${epkPublicSignals}`

            console.log(command)
            const { stdout, stderr } = exec(command)
            console.log(stdout.trim(), stderr.trim())

            const verifyRegMatch = stdout
                .trim()
                .match(
                    /Verify epoch key proof with epoch key ([0-9]+) succeed/
                ) as any
            expect(verifyRegMatch[1]).equals(epk)
            expect(verifyRegMatch).not.equal(null)
        })
    })

    describe('genReputation CLI subcommand', () => {
        it('should generate a reputation proof for a post', async () => {
            const command =
                `npx ts-node cli/index.ts genReputationProof` +
                ` -x ${unirepSocialContract.address} ` +
                ` -id ${userIdentity1}` +
                ` -n ${epochKeyNonce}` +
                ` -act post `

            console.log(command)
            const { stdout, stderr } = exec(command)
            console.log(stdout.trim(), stderr.trim())

            const epkRegMatch = stdout
                .trim()
                .match(
                    /Epoch key of epoch 1 and nonce 0: ([a-fA-F0-9]+)/
                ) as any
            epk = epkRegMatch[1]

            const userRepProofRegMatch = stdout
                .trim()
                .match(/(Unirep.reputation.proof.[a-zA-Z0-9\-\_]+)/) as any
            const publicSignalRegMatch = stdout
                .trim()
                .match(/(Unirep.reputation.publicSignals.[a-zA-Z0-9]+)/) as any
            expect(userRepProofRegMatch).not.equal(null)
            userRepProof = userRepProofRegMatch[1]
            expect(publicSignalRegMatch).not.equal(null)
            repPublicSignals = publicSignalRegMatch[1]
        })
    })

    describe('publishPost CLI subcommand', () => {
        it('should publish a post', async () => {
            const command =
                `npx ts-node cli/index.ts publishPost` +
                ` -x ${unirepSocialContract.address} ` +
                ` -tx ${text}` +
                ` -d ${deployerPrivKey}` +
                ` -p ${repPublicSignals}` +
                ` -pf ${userRepProof}`

            console.log(command)
            const { stdout, stderr } = exec(command)
            console.log(stdout.trim(), stderr.trim())

            const postRegMatch = stdout
                .trim()
                .match(/Transaction hash: 0x[a-fA-F0-9]{64}/) as any
            expect(postRegMatch).not.equal(null)

            const proofIndexRegMatch = stdout
                .trim()
                .match(/Proof index: ([0-9]+)/) as any
            proofIdx = proofIndexRegMatch[1]
        })
    })

    describe('verifyReputationProof CLI subcommand', () => {
        it('should verify reputation proof', async () => {
            const command =
                `npx ts-node cli/index.ts verifyReputationProof` +
                ` -x ${unirepSocialContract.address} ` +
                ` -pf ${userRepProof} ` +
                ` -p ${repPublicSignals}`

            console.log(command)
            const { stdout, stderr } = exec(command)
            console.log(stdout.trim(), stderr.trim())

            const verifyRegMatch = stdout
                .trim()
                .match(
                    /Verify reputation proof of epoch key [a-zA-Z0-9 ]+ succeed/
                ) as any
            expect(verifyRegMatch).not.equal(null)
        })
    })

    describe('genReputation CLI subcommand', () => {
        it('should generate a reputation proof for a comment', async () => {
            const command =
                `npx ts-node cli/index.ts genReputationProof` +
                ` -x ${unirepSocialContract.address} ` +
                ` -id ${userIdentity1}` +
                ` -n ${epochKeyNonce}` +
                ` -act comment ` +
                ` -mr ${minRepDiff}`

            console.log(command)
            const { stdout, stderr } = exec(command)
            console.log(stdout.trim(), stderr.trim())

            const epkRegMatch = stdout
                .trim()
                .match(
                    /Epoch key of epoch 1 and nonce 0: ([a-fA-F0-9]+)/
                ) as any
            epk = epkRegMatch[1]

            const userRepProofRegMatch = stdout
                .trim()
                .match(/(Unirep.reputation.proof.[a-zA-Z0-9\-\_]+)/) as any
            const publicSignalRegMatch = stdout
                .trim()
                .match(/(Unirep.reputation.publicSignals.[a-zA-Z0-9]+)/) as any
            expect(userRepProofRegMatch).not.equal(null)
            userRepProof = userRepProofRegMatch[1]
            expect(publicSignalRegMatch).not.equal(null)
            repPublicSignals = publicSignalRegMatch[1]
        })
    })

    describe('leaveComment CLI subcommand', () => {
        it('should leave a comment', async () => {
            const command =
                `npx ts-node cli/index.ts leaveComment` +
                ` -x ${unirepSocialContract.address} ` +
                ` -pid ${1} ` +
                ` -tx ${text2}` +
                ` -d ${deployerPrivKey}` +
                ` -p ${repPublicSignals}` +
                ` -pf ${userRepProof}`

            console.log(command)
            const { stdout, stderr } = exec(command)
            console.log(stdout.trim(), stderr.trim())

            const commentRegMatch = stdout
                .trim()
                .match(/Transaction hash: 0x[a-fA-F0-9]{64}/) as any
            expect(commentRegMatch).not.equal(null)
        })
    })

    // describe('genAirdropProof CLI subcommand', () => {
    //     it('should submit an airdrop query', async () => {
    //         const command =
    //             `npx ts-node cli/index.ts genAirdropProof` +
    //             ` -x ${unirepSocialContract.address} ` +
    //             ` -id ${userIdentity1}`

    //         console.log(command)
    //         const { stdout, stderr } = exec(command)
    //         console.log(stdout.trim(), stderr.trim())

    //         const airdropProofRegMatch = stdout
    //             .trim()
    //             .match(/(Unirep.signUp.proof.[a-zA-Z0-9\-\_]+)/) as any
    //         const publicSignalRegMatch = stdout
    //             .trim()
    //             .match(/(Unirep.signUp.publicSignals.[a-zA-Z0-9]+)/) as any
    //         expect(airdropProofRegMatch).not.equal(null)
    //         airdropProof = airdropProofRegMatch[1]
    //         expect(publicSignalRegMatch).not.equal(null)
    //         airdropPublicSignals = publicSignalRegMatch[1]
    //     })
    // })

    // describe('giveAirdrop CLI subcommand', () => {
    //     it('should submit an airdrop query', async () => {
    //         const command =
    //             `npx ts-node cli/index.ts giveAirdrop` +
    //             ` -x ${unirepSocialContract.address} ` +
    //             ` -p ${airdropPublicSignals} ` +
    //             ` -pf ${airdropProof} ` +
    //             ` -d ${deployerPrivKey} `

    //         console.log(command)
    //         const { stdout, stderr } = exec(command)
    //         console.log(stdout.trim(), stderr.trim())

    //         const commentRegMatch = stdout
    //             .trim()
    //             .match(/Transaction hash: 0x[a-fA-F0-9]{64}/) as any
    //         expect(commentRegMatch).not.equal(null)
    //     })
    // })

    describe('genReputation CLI subcommand', () => {
        it('should generate a reputation proof for a vote', async () => {
            const command =
                `npx ts-node cli/index.ts genReputationProof` +
                ` -x ${unirepSocialContract.address} ` +
                ` -id ${userIdentity2}` +
                ` -n ${epochKeyNonce}` +
                ` -act vote ` +
                ` -v ${posRep}`

            console.log(command)
            const { stdout, stderr } = exec(command)
            console.log(stdout.trim(), stderr.trim())

            const epkRegMatch = stdout
                .trim()
                .match(
                    /Epoch key of epoch 1 and nonce 0: ([a-fA-F0-9]+)/
                ) as any
            expect(epkRegMatch).not.equal(null)

            const userRepProofRegMatch = stdout
                .trim()
                .match(/(Unirep.reputation.proof.[a-zA-Z0-9\-\_]+)/) as any
            const publicSignalRegMatch = stdout
                .trim()
                .match(/(Unirep.reputation.publicSignals.[a-zA-Z0-9]+)/) as any
            expect(userRepProofRegMatch).not.equal(null)
            userRepProof = userRepProofRegMatch[1]
            expect(publicSignalRegMatch).not.equal(null)
            repPublicSignals = publicSignalRegMatch[1]
        })
    })

    describe('upvote CLI subcommand', () => {
        it('should upvote to user 1', async () => {
            const command =
                `npx ts-node cli/index.ts vote` +
                ` -x ${unirepSocialContract.address} ` +
                ` -d ${attesterPrivKey} ` +
                ` -epk ${epk} ` +
                ` -p ${repPublicSignals}` +
                ` -pf ${userRepProof}` +
                ` -uv ${posRep} `

            console.log(command)
            const { stdout, stderr } = exec(command)
            console.log(stdout.trim(), stderr.trim())

            const txRegMatch = stdout
                .trim()
                .match(/Transaction hash: 0x[a-fA-F0-9]{64}/) as any
            expect(txRegMatch).not.equal(null)
        })
    })

    describe('verifyReputationProof CLI subcommand', () => {
        it('should verify reputation proof', async () => {
            const command =
                `npx ts-node cli/index.ts verifyReputationProof` +
                ` -x ${unirepSocialContract.address} ` +
                ` -pf ${userRepProof} ` +
                ` -p ${repPublicSignals}`

            console.log(command)
            const { stdout, stderr } = exec(command)
            console.log(stdout.trim(), stderr.trim())

            const verifyRegMatch = stdout
                .trim()
                .match(
                    /Verify reputation proof of epoch key [a-zA-Z0-9 ]+ succeed/
                ) as any
            expect(verifyRegMatch).not.equal(null)
        })
    })

    describe('epochTransition CLI subcommand', () => {
        it('should transition to next epoch', async () => {
            const command =
                `npx ts-node cli/index.ts epochTransition` +
                ` -x ${unirepSocialContract.address} ` +
                ` -d ${deployerPrivKey} ` +
                ` -t `

            console.log(command)
            const { stdout, stderr } = exec(command)
            console.log(stdout.trim(), stderr.trim())

            const epochEndRegMatch = stdout
                .trim()
                .match(/End of epoch: 1/) as any
            expect(epochEndRegMatch).not.equal(null)
        })
    })

    describe('userStateTransition CLI subcommand', () => {
        it('should transition user 1 state', async () => {
            const command =
                `npx ts-node cli/index.ts userStateTransition` +
                ` -x ${unirepSocialContract.address} ` +
                ` -d ${deployerPrivKey} ` +
                ` -id ${userIdentity1} `

            console.log(command)
            const { stdout, stderr } = exec(command)
            console.log(stdout.trim(), stderr.trim())

            const userTransitionRegMatch = stdout
                .trim()
                .match(/User transitioned from epoch 1 to epoch 2/) as any
            expect(userTransitionRegMatch).not.equal(null)
        })

        it('should transition user 2 state', async () => {
            const command =
                `npx ts-node cli/index.ts userStateTransition` +
                ` -x ${unirepSocialContract.address} ` +
                ` -d ${deployerPrivKey} ` +
                ` -id ${userIdentity2} `

            console.log(command)
            const { stdout, stderr } = exec(command)
            console.log(stdout.trim(), stderr.trim())

            const userTransitionRegMatch = stdout
                .trim()
                .match(/User transitioned from epoch 1 to epoch 2/) as any
            expect(userTransitionRegMatch).not.equal(null)
        })
    })
})
