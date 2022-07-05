import { createContext } from 'react'
import { ethers } from 'ethers'
import UnirepContext from './Unirep'
import { DEFAULT_ETH_PROVIDER } from '../config'
import { Attestation } from '@unirep/unirep'
import { UnirepState, UserState } from '../overrides/unirep'
import {
    Circuit,
    formatProofForSnarkjsVerification,
    verifyProof,
} from '@unirep/circuits'
import { stringifyBigInts, unstringifyBigInts } from '@unirep/crypto'

const unirepConfig = (UnirepContext as any)._currentValue

const encodeBigIntArray = (arr: BigInt[]): string => {
    return JSON.stringify(stringifyBigInts(arr))
}

const decodeBigIntArray = (input: string): BigInt[] => {
    return unstringifyBigInts(JSON.parse(input))
}

type ProofKey = string

export class Synchronizer {
    unirepState?: UnirepState
    userState?: UserState
    validProofs = {} as { [key: ProofKey]: any }
    spentProofs = {} as { [key: ProofKey]: boolean }
    latestProcessedBlock = 0
    protected daemonRunning = false
    protected daemonPromise = Promise.resolve()
    // progress management
    startBlock = 0
    latestBlock = 0
    isInitialSyncing = true
    initialSyncFinalBlock = Infinity

    constructor() {
        // makeAutoObservable(this)
    }

    // calculate a key for storing/accessing a proof
    proofKey(epoch: number | null, index: number): ProofKey {
        return `epoch-${epoch}-index-${index}`
    }

    get syncPercent() {
        if (
            this.startBlock === 0 ||
            this.latestBlock === 0 ||
            this.latestProcessedBlock === 0
        ) {
            return 0
        }
        return (
            (100 * (this.latestProcessedBlock - this.startBlock)) /
            (this.latestBlock - this.startBlock)
        )
    }

    async load() {
        await unirepConfig.loadingPromise
        // now start syncing
        const storedState = localStorage.getItem('sync-latestBlock')
        if (storedState) {
            const data = JSON.parse(storedState, (key, value) => {
                if (
                    typeof value === 'object' &&
                    value &&
                    value.type === 'BigNumber'
                ) {
                    return ethers.BigNumber.from(value.hex)
                }
                return value
            })
            Object.assign(this, data)
        }
        this.unirepState = new UnirepState({
            globalStateTreeDepth: unirepConfig.globalStateTreeDepth,
            userStateTreeDepth: unirepConfig.userStateTreeDepth,
            epochTreeDepth: unirepConfig.epochTreeDepth,
            attestingFee: unirepConfig.attestingFee,
            epochLength: unirepConfig.epochLength,
            numEpochKeyNoncePerEpoch: unirepConfig.numEpochKeyNoncePerEpoch,
            maxReputationBudget: unirepConfig.maxReputationBudget,
        })
    }

    init() {
        this.latestProcessedBlock = 0
        this.latestBlock = 0
        this.startBlock = 0
        this.validProofs = {}
        this.spentProofs = {}

        this.userState = undefined
        this.unirepState = undefined
    }

    save() {
        localStorage.setItem(
            'sync-latestBlock',
            JSON.stringify({
                latestProcessedBlock: this.latestProcessedBlock,
                latestBlock: this.latestBlock,
                startBlock: this.startBlock,
                validProofs: this.validProofs,
                spentProofs: this.spentProofs,
            })
        )
    }

    // wait until we've synced to the latest known block
    async waitForSync(blockNumber?: number) {
        const targetBlock =
            blockNumber ?? (await DEFAULT_ETH_PROVIDER.getBlockNumber())
        console.log('waiting for block', targetBlock)
        for (;;) {
            if (this.latestProcessedBlock >= targetBlock) return
            await new Promise((r) => setTimeout(r, 2000))
        }
    }

    async startDaemon() {
        if (this.daemonRunning) {
            throw new Error('Cannot start multiple daemons')
        }
        console.log('Starting daemon')
        this.daemonPromise = this._startDaemon()
    }

    private async _startDaemon() {
        this.daemonRunning = true
        this.isInitialSyncing = true
        let latestBlock = await DEFAULT_ETH_PROVIDER.getBlockNumber()
        this.latestBlock = latestBlock
        const handler = (num: number) => {
            if (num > latestBlock) {
                latestBlock = num
                this.latestBlock = num
            }
        }
        DEFAULT_ETH_PROVIDER.on('block', handler)

        this.initialSyncFinalBlock = this.latestBlock
        this.isInitialSyncing =
            this.latestProcessedBlock < this.initialSyncFinalBlock

        for (;;) {
            if (!this.daemonRunning) {
                DEFAULT_ETH_PROVIDER.off('block', handler)
                return
            }
            if (this.latestProcessedBlock === latestBlock) {
                await new Promise((r) => setTimeout(r, 1000))
                continue
            }
            const newLatest = latestBlock
            const allEvents = (
                await unirepConfig.unirep.queryFilter(
                    this.unirepFilter,
                    this.latestProcessedBlock + 1,
                    newLatest
                )
            ).flat() as ethers.Event[]
            // first process historical ones then listen
            await this.processEvents(allEvents)
            this.latestProcessedBlock = newLatest
            this.isInitialSyncing = newLatest <= this.initialSyncFinalBlock
            this.save()
        }
    }

    get allTopics() {
        const [UserSignedUp] = unirepConfig.unirep.filters.UserSignedUp()
            .topics as string[]
        const [UserStateTransitioned] =
            unirepConfig.unirep.filters.UserStateTransitioned()
                .topics as string[]
        const [AttestationSubmitted] =
            unirepConfig.unirep.filters.AttestationSubmitted()
                .topics as string[]
        const [EpochEnded] = unirepConfig.unirep.filters.EpochEnded()
            .topics as string[]
        const [IndexedEpochKeyProof] =
            unirepConfig.unirep.filters.IndexedEpochKeyProof()
                .topics as string[]
        const [IndexedReputationProof] =
            unirepConfig.unirep.filters.IndexedReputationProof()
                .topics as string[]
        const [IndexedUserSignedUpProof] =
            unirepConfig.unirep.filters.IndexedUserSignedUpProof()
                .topics as string[]
        const [IndexedStartedTransitionProof] =
            unirepConfig.unirep.filters.IndexedStartedTransitionProof()
                .topics as string[]
        const [IndexedProcessedAttestationsProof] =
            unirepConfig.unirep.filters.IndexedProcessedAttestationsProof()
                .topics as string[]
        const [IndexedUserStateTransitionProof] =
            unirepConfig.unirep.filters.IndexedUserStateTransitionProof()
                .topics as string[]
        const [_UserSignedUp] = unirepConfig.unirepSocial.filters.UserSignedUp()
            .topics as string[]
        const [_PostSubmitted] =
            unirepConfig.unirepSocial.filters.PostSubmitted().topics as string[]
        const [_CommentSubmitted] =
            unirepConfig.unirepSocial.filters.CommentSubmitted()
                .topics as string[]
        const [_VoteSubmitted] =
            unirepConfig.unirepSocial.filters.VoteSubmitted().topics as string[]
        const [_AirdropSubmitted] =
            unirepConfig.unirepSocial.filters.AirdropSubmitted()
                .topics as string[]
        return {
            UserSignedUp,
            UserStateTransitioned,
            AttestationSubmitted,
            EpochEnded,
            IndexedEpochKeyProof,
            IndexedReputationProof,
            IndexedUserSignedUpProof,
            IndexedStartedTransitionProof,
            IndexedProcessedAttestationsProof,
            IndexedUserStateTransitionProof,
            _UserSignedUp,
            _PostSubmitted,
            _CommentSubmitted,
            _VoteSubmitted,
            _AirdropSubmitted,
        }
    }

    get unirepFilter() {
        const [UserSignedUp] = unirepConfig.unirep.filters.UserSignedUp()
            .topics as string[]
        const [UserStateTransitioned] =
            unirepConfig.unirep.filters.UserStateTransitioned()
                .topics as string[]
        const [AttestationSubmitted] =
            unirepConfig.unirep.filters.AttestationSubmitted()
                .topics as string[]
        const [EpochEnded] = unirepConfig.unirep.filters.EpochEnded()
            .topics as string[]
        const [IndexedEpochKeyProof] =
            unirepConfig.unirep.filters.IndexedEpochKeyProof()
                .topics as string[]
        const [IndexedReputationProof] =
            unirepConfig.unirep.filters.IndexedReputationProof()
                .topics as string[]
        const [IndexedUserSignedUpProof] =
            unirepConfig.unirep.filters.IndexedUserSignedUpProof()
                .topics as string[]
        const [IndexedStartedTransitionProof] =
            unirepConfig.unirep.filters.IndexedStartedTransitionProof()
                .topics as string[]
        const [IndexedProcessedAttestationsProof] =
            unirepConfig.unirep.filters.IndexedProcessedAttestationsProof()
                .topics as string[]
        const [IndexedUserStateTransitionProof] =
            unirepConfig.unirep.filters.IndexedUserStateTransitionProof()
                .topics as string[]

        return {
            address: unirepConfig.unirep.address,
            topics: [
                [
                    UserSignedUp,
                    UserStateTransitioned,
                    AttestationSubmitted,
                    EpochEnded,
                    IndexedEpochKeyProof,
                    IndexedReputationProof,
                    IndexedUserSignedUpProof,
                    IndexedStartedTransitionProof,
                    IndexedProcessedAttestationsProof,
                    IndexedUserStateTransitionProof,
                ],
            ],
        }
    }

    get unirepSocialFilter() {
        const [_UserSignedUp] = unirepConfig.unirepSocial.filters.UserSignedUp()
            .topics as string[]
        const [_PostSubmitted] =
            unirepConfig.unirepSocial.filters.PostSubmitted().topics as string[]
        const [_CommentSubmitted] =
            unirepConfig.unirepSocial.filters.CommentSubmitted()
                .topics as string[]
        const [_VoteSubmitted] =
            unirepConfig.unirepSocial.filters.VoteSubmitted().topics as string[]
        const [_AirdropSubmitted] =
            unirepConfig.unirepSocial.filters.AirdropSubmitted()
                .topics as string[]
        // Unirep Social events
        return {
            address: unirepConfig.unirepSocial.address,
            topics: [
                [
                    _UserSignedUp,
                    _PostSubmitted,
                    _CommentSubmitted,
                    _VoteSubmitted,
                    _AirdropSubmitted,
                ],
            ],
        }
    }

    async processEvents(_events: ethers.Event | ethers.Event[]) {
        const events = [_events].flat()
        if (events.length === 0) return
        events.sort((a: any, b: any) => {
            if (a.blockNumber !== b.blockNumber) {
                return a.blockNumber - b.blockNumber
            }
            if (a.transactionIndex !== b.transactionIndex) {
                return a.transactionIndex - b.transactionIndex
            }
            return a.logIndex - b.logIndex
        })
        if (this.startBlock === 0) {
            this.startBlock = events[0].blockNumber
        }

        for (const event of events) {
            try {
                await this._processEvent(event)
                this.latestProcessedBlock = event.blockNumber
            } catch (err) {
                console.log('Error processing event', err)
                console.log(event)
            }
        }
    }

    protected async _processEvent(event: any) {
        // no, i don't know what a switch statement is...
        if (event.topics[0] === this.allTopics.IndexedEpochKeyProof) {
            console.log('IndexedEpochKeyProof')
            const _proofIndex = Number(event.topics[1])
            const _epoch = Number(event.topics[2])
            const decodedData = unirepConfig.unirep.interface.decodeEventLog(
                'IndexedEpochKeyProof',
                event.data
            )
            if (!decodedData) {
                throw new Error('Failed to decode data')
            }
            const args = decodedData._proof

            const formatPublicSignals = []
                .concat(args.globalStateTree, args.epoch, args.epochKey)
                .map((n) => BigInt(n))
            const formattedProof = args.proof.map((n: any) => BigInt(n))
            // const proof = encodeBigIntArray(formattedProof)
            // const publicSignals = encodeBigIntArray(formatPublicSignals)
            const isValid = await verifyProof(
                Circuit.verifyEpochKey,
                formatProofForSnarkjsVerification(formattedProof),
                formatPublicSignals
            )
            const isGSTRootExisted = this.unirepState?.GSTRootExists(
                args.globalStateTree,
                _epoch
            )
            if (isValid && isGSTRootExisted) {
                console.log('mark', decodedData)
                this.validProofs[this.proofKey(_epoch, _proofIndex)] =
                    decodedData
            } else {
                console.error('Invalid gst 1')
            }
        } else if (event.topics[0] === this.allTopics.IndexedReputationProof) {
            console.log('IndexedReputationProof')
            const _proofIndex = Number(event.topics[1])
            const _epoch = Number(event.topics[2])
            const epochKey = event.topics[3]
            const decodedData = unirepConfig.unirep.interface.decodeEventLog(
                'IndexedReputationProof',
                event.data
            )
            if (!decodedData) {
                throw new Error('Failed to decode data')
            }
            const args = decodedData._proof
            const formatPublicSignals = []
                .concat(
                    args.repNullifiers,
                    args.epoch,
                    args.epochKey,
                    args.globalStateTree,
                    args.attesterId,
                    args.proveReputationAmount,
                    args.minRep,
                    args.proveGraffiti,
                    args.graffitiPreImage
                )
                .map((n) => BigInt(n))
            const formattedProof = args.proof.map((n: any) => BigInt(n))
            const isValid = await verifyProof(
                Circuit.proveReputation,
                formatProofForSnarkjsVerification(formattedProof),
                formatPublicSignals
            )
            const isGSTRootExisted = this.unirepState?.GSTRootExists(
                args.globalStateTree,
                _epoch
            )
            let validNullifiers = true
            const nullifiers = args.repNullifiers.map((n: any) => BigInt(n))
            const nullifiersAmount = Number(args.proveReputationAmount)
            for (let j = 0; j < nullifiersAmount; j++) {
                if (this.unirepState?.nullifierExist(nullifiers[j])) {
                    console.log(
                        'duplicated nullifier',
                        BigInt(nullifiers[j]).toString()
                    )
                    validNullifiers = false
                    break
                }
            }

            if (validNullifiers) {
                for (let j = 0; j < nullifiersAmount; j++) {
                    this.userState?.addReputationNullifiers(
                        nullifiers[j],
                        event.blockNumber
                    )
                }
            }
            if (isValid && isGSTRootExisted && validNullifiers) {
                const epkLength = unirepConfig.epochTreeDepth / 4
                this.validProofs[this.proofKey(_epoch, _proofIndex)] = {
                    epochKey: epochKey.slice(-epkLength),
                    epoch: _epoch,
                    proof: decodedData._proof,
                    proofIndex: _proofIndex,
                    isReputation: true,
                }
            } else {
                console.error('Invalid gst 2')
            }
        } else if (
            event.topics[0] === this.allTopics.IndexedUserSignedUpProof
        ) {
            console.log('IndexedUserSignedUpProof')
            const _proofIndex = Number(event.topics[1])
            const _epoch = Number(event.topics[2])
            const epochKey = event.topics[3]
            const decodedData = unirepConfig.unirep.interface.decodeEventLog(
                'IndexedUserSignedUpProof',
                event.data
            )
            if (!decodedData) {
                throw new Error('Failed to decode data')
            }
            const args = decodedData._proof

            const formatPublicSignals = []
                .concat(
                    args.epoch,
                    args.epochKey,
                    args.globalStateTree,
                    args.attesterId,
                    args.userHasSignedUp
                )
                .map((n) => BigInt(n))
            const formattedProof = args.proof.map((n: any) => BigInt(n))
            const isValid = await verifyProof(
                Circuit.proveUserSignUp,
                formatProofForSnarkjsVerification(formattedProof),
                formatPublicSignals
            )
            const isGSTRootExisted = this.unirepState?.GSTRootExists(
                args.globalStateTree,
                _epoch
            )
            if (isValid && isGSTRootExisted) {
                const epkLength = unirepConfig.epochTreeDepth / 4
                this.validProofs[this.proofKey(_epoch, _proofIndex)] = {
                    epochKey: epochKey.slice(-epkLength),
                    epoch: _epoch,
                    proof: decodedData._proof,
                    proofIndex: _proofIndex,
                }
            } else {
                console.error('Invalid gst 3')
            }
        } else if (
            event.topics[0] === this.allTopics.IndexedStartedTransitionProof
        ) {
            console.log('IndexedStartedTransitionProof')
            const _proofIndex = Number(event.topics[1])
            const _blindedUserState = BigInt(event.topics[2])
            const _globalStateTree = BigInt(event.topics[3])
            const decodedData = unirepConfig.unirep.interface.decodeEventLog(
                'IndexedStartedTransitionProof',
                event.data
            )
            if (!decodedData) {
                throw new Error('Failed to decode data')
            }
            const _blindedHashChain = BigInt(decodedData._blindedHashChain)
            const formatPublicSignals = [
                _blindedUserState,
                _blindedHashChain,
                _globalStateTree,
            ]
            const formattedProof = decodedData._proof.map((n: any) => BigInt(n))
            const isValid = await verifyProof(
                Circuit.startTransition,
                formatProofForSnarkjsVerification(formattedProof),
                formatPublicSignals
            )
            if (isValid) {
                this.validProofs[this.proofKey(null, _proofIndex)] = decodedData
            } else {
                console.error('Invalid gst 4')
            }
        } else if (
            event.topics[0] === this.allTopics.IndexedProcessedAttestationsProof
        ) {
            console.log('IndexedProcessedAttestationsProof')
            // await this.processAttestationProofEvent(event)
            const _proofIndex = Number(event.topics[1])
            const _inputBlindedUserState = BigInt(event.topics[2])
            const decodedData = unirepConfig.unirep.interface.decodeEventLog(
                'IndexedProcessedAttestationsProof',
                event.data
            )
            if (!decodedData) {
                throw new Error('Failed to decode data')
            }
            const _outputBlindedUserState = BigInt(
                decodedData._outputBlindedUserState
            )
            const _outputBlindedHashChain = BigInt(
                decodedData._outputBlindedHashChain
            )

            const formatPublicSignals = [
                _outputBlindedUserState,
                _outputBlindedHashChain,
                _inputBlindedUserState,
            ]
            const formattedProof = decodedData._proof.map((n: any) => BigInt(n))
            const isValid = await verifyProof(
                Circuit.processAttestations,
                formatProofForSnarkjsVerification(formattedProof),
                formatPublicSignals
            )
            // verify the GST root when it's used in a transition
            if (isValid) {
                this.validProofs[this.proofKey(null, _proofIndex)] = decodedData
            } else {
                console.error('Invalid gst 5')
            }
        } else if (
            event.topics[0] === this.allTopics.IndexedUserStateTransitionProof
        ) {
            console.log('IndexedUserStateTransitionProof')
            await this.userStateTransitionProof(event)
        } else if (event.topics[0] === this.allTopics.UserSignedUp) {
            console.log('UserSignedUp')
            const decodedData = unirepConfig.unirep.interface.decodeEventLog(
                'UserSignedUp',
                event.data
            )
            const epoch = Number(event.topics[1])
            const idCommitment = BigInt(event.topics[2])
            const attesterId = Number(decodedData._attesterId)
            const airdrop = Number(decodedData._airdropAmount)
            await this.userState?.signUp(
                epoch,
                idCommitment,
                attesterId,
                airdrop,
                event.blockNumber
            )
        } else if (event.topics[0] === this.allTopics.UserStateTransitioned) {
            console.log('UserStateTransitioned')
            // await this.USTEvent(event)
            await this._userStateTransition(event)
        } else if (event.topics[0] === this.allTopics.AttestationSubmitted) {
            console.log('AttestationSubmitted')
            await this.attestationSubmitted(event)
        } else if (event.topics[0] === this.allTopics.EpochEnded) {
            console.log('EpochEnded')
            await this.epochEnded(event)
        } else {
            console.log(event)
            throw new Error(`Unrecognized event topic "${event.topics[0]}"`)
        }
    }

    protected async _userStateTransition(event: any) {
        const decodedData = unirepConfig.unirep.interface.decodeEventLog(
            'UserStateTransitioned',
            event.data
        )

        // const transactionHash = event.transactionHash
        const epoch = Number(event.topics[1])
        const leaf = BigInt(event.topics[2])
        const proofIndex = Number(decodedData._proofIndex)
        const proof = this.validProofs[this.proofKey(null, proofIndex)]
        if (!proof) return console.error('Invalid proof')
        const epkNullifiers = proof._proof.epkNullifiers.map((n: any) =>
            BigInt(n)
        )
        for (const nullifier of epkNullifiers) {
            if (this.unirepState?.nullifierExist(nullifier)) {
                return console.error('duplicate nullifier')
            }
        }
        const fromEpoch = Number(proof._proof.transitionFromEpoch.toString())
        await this.userState?.userStateTransition(
            fromEpoch,
            leaf,
            epkNullifiers,
            event.blockNumber
        )
    }

    protected async userStateTransitionProof(event: any) {
        const _proofIndex = Number(event.topics[1])
        const decodedData = unirepConfig.unirep.interface.decodeEventLog(
            'IndexedUserStateTransitionProof',
            event.data
        )
        if (!decodedData) {
            throw new Error('Failed to decode data')
        }
        const args = decodedData._proof
        const proofIndexRecords = decodedData._proofIndexRecords.map((n: any) =>
            Number(n)
        )

        const formatPublicSignals = []
            .concat(
                args.newGlobalStateTreeLeaf,
                args.epkNullifiers,
                args.transitionFromEpoch,
                args.blindedUserStates,
                args.fromGlobalStateTree,
                args.blindedHashChains,
                args.fromEpochTree
            )
            .map((n) => BigInt(n))
        const formattedProof = args.proof.map((n: any) => BigInt(n))
        const proof = encodeBigIntArray(formattedProof)
        const publicSignals = encodeBigIntArray(formatPublicSignals)
        const isValid = await verifyProof(
            Circuit.userStateTransition,
            formatProofForSnarkjsVerification(formattedProof),
            formatPublicSignals
        )
        if (isValid) {
            this.validProofs[this.proofKey(null, _proofIndex)] = decodedData
        } else {
            console.error('Invalid gst root 5')
        }
    }

    protected async attestationSubmitted(event: any) {
        const _epoch = Number(event.topics[1])
        const _epochKey = ethers.BigNumber.from(event.topics[2])
        const _attester = event.topics[3]
        const decodedData = unirepConfig.unirep.interface.decodeEventLog(
            'AttestationSubmitted',
            event.data
        )
        const toProofIndex = Number(decodedData.toProofIndex)
        const fromProofIndex = Number(decodedData.fromProofIndex)
        if (!this.validProofs[this.proofKey(_epoch, toProofIndex)])
            return console.error('Invalid attestation 1')
        const attestationProof =
            this.validProofs[this.proofKey(_epoch, toProofIndex)]
        if (
            fromProofIndex &&
            this.spentProofs[this.proofKey(_epoch, fromProofIndex)]
        )
            return console.error('Invalid attestation 2')
        if (fromProofIndex) {
            if (!this.validProofs[this.proofKey(_epoch, fromProofIndex)]) return
            const proof =
                this.validProofs[this.proofKey(_epoch, fromProofIndex)]
            if (!proof.isReputation) return console.error('non-rep proof')
            const proveReputationAmount = Number(
                proof.proof.proveReputationAmount
            )
            if (!attestationProof) return console.error('No to proof')
            if (
                proveReputationAmount !==
                Number(decodedData._attestation.posRep) +
                    Number(decodedData._attestation.negRep)
            )
                return console.error('not enough rep')
        }
        if (fromProofIndex)
            this.spentProofs[this.proofKey(_epoch, fromProofIndex)] = true
        const attestation = new Attestation(
            BigInt(decodedData._attestation.attesterId),
            BigInt(decodedData._attestation.posRep),
            BigInt(decodedData._attestation.negRep),
            BigInt(decodedData._attestation.graffiti),
            BigInt(decodedData._attestation.signUp)
        )
        if (!_epochKey.eq('0x' + attestationProof.epochKey))
            return console.error('epoch key mismatch')
        if (this.unirepState?.isEpochKeySealed(_epochKey.toString()))
            return console.error('epoch key sealed')
        this.unirepState?.addAttestation(
            _epochKey.toString(),
            attestation,
            event.blockNumber
        )
        // A hack to pass data to the subclass
        if (!fromProofIndex) {
            return {
                epoch: _epoch,
                epochKey: _epochKey,
                spentAmount: attestation.negRep,
            }
        }
    }

    protected async epochEnded(event: any) {
        const epoch = Number(event.topics[1])
        await this.userState?.epochTransition(epoch, event.blockNumber)
    }
}

export default createContext(new Synchronizer())
