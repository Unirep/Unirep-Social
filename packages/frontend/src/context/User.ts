import { createContext } from 'react'
import { makeObservable, observable, computed } from 'mobx'
import * as config from '../config'
import { ethers } from 'ethers'
import { ZkIdentity, Strategy } from '@unirep/crypto'
import { Attestation } from '@unirep/contracts'
import { makeURL } from '../utils'
import { genEpochKey, UserState, schema } from '@unirep/core'
import prover from './prover'
import UnirepContext from './Unirep'
import { IndexedDBConnector } from 'anondb/web'

export class User {
    id?: ZkIdentity
    allEpks = [] as string[]
    currentEpoch = 0
    reputation = 30
    unirepConfig = (UnirepContext as any)._currentValue
    spent = 0
    loadingPromise
    userState?: UserState

    syncPercent: any
    startBlock: any
    latestBlock: any
    latestProcessedBlock: any
    isInitialSyncing: any

    constructor() {
        makeObservable(this, {
            userState: observable,
            currentEpoch: observable,
            reputation: observable,
            spent: observable,
            currentEpochKeys: computed,
            allEpks: observable,
            // syncPercent: computed,
            // startBlock: observable,
            // latestBlock: observable,
            // latestProcessedBlock: observable,
            // isInitialSyncing: observable,
            id: observable,
        })
        if (typeof window !== 'undefined') {
            this.loadingPromise = this.load()
        } else {
            this.loadingPromise = Promise.resolve()
        }
    }

    get netReputation() {
        return this.reputation - this.spent
    }

    get isSynced() {
        return false
        // return this.currentEpoch === this.userState?.currentEpoch
    }

    // must be called in browser, not in SSR
    async load() {
        await this.unirepConfig.loadingPromise
        const storedIdentity = window.localStorage.getItem('identity')
        if (storedIdentity) {
            const id = new ZkIdentity(Strategy.SERIALIZED, storedIdentity)
            await this.setIdentity(id)
            await this.calculateAllEpks()
            await this.userState?.start()
            this.userState?.waitForSync().then(() => {
                this.loadReputation()
            })
        }

        // start listening for new epochs
        this.unirepConfig.unirep.on(
            'EpochEnded',
            this.loadCurrentEpoch.bind(this)
        )
        await this.loadCurrentEpoch()
    }

    save() {
        if (this.id) {
            window.localStorage.setItem('identity', this.id.serializeIdentity())
        }
    }

    async loadCurrentEpoch() {
        await this.unirepConfig.loadingPromise
        this.currentEpoch = Number(
            await this.unirepConfig.unirep.currentEpoch()
        )
        return this.currentEpoch
    }

    get currentEpochKeys() {
        return this.allEpks.slice(
            -1 * this.unirepConfig.numEpochKeyNoncePerEpoch
        )
    }

    get identity() {
        if (!this.id) return undefined
        const serializedIdentity = this.id.serializeIdentity()
        return serializedIdentity
    }

    get needsUST() {
        if (!this.userState) return false
        return false
        // return this.currentEpoch > (await this.userState.latestTransitionedEpoch())
    }

    async setIdentity(identity: string | ZkIdentity) {
        if (this.userState) {
            throw new Error('Identity already set, change is not supported')
        }
        if (typeof identity === 'string') {
            this.id = new ZkIdentity(Strategy.SERIALIZED, identity)
        } else {
            this.id = identity
        }
        const db = await IndexedDBConnector.create(schema, 1)
        this.userState = new UserState(
            db,
            prover as any,
            this.unirepConfig.unirep,
            this.id
        )
        const [EpochEnded] = this.unirepConfig.unirep.filters.EpochEnded()
            .topics as string[]
        const [AttestationSubmitted] =
            this.unirepConfig.unirep.filters.AttestationSubmitted()
                .topics as string[]
        this.userState.on(EpochEnded, this.epochEnded.bind(this))
        this.userState.on(
            AttestationSubmitted,
            this.attestationSubmitted.bind(this)
        )
    }

    async calculateAllEpks() {
        if (!this.id) throw new Error('No identity loaded')
        await this.unirepConfig.loadingPromise
        const { identityNullifier } = this.id
        const getEpochKeys = (epoch: number) => {
            const epks: string[] = []
            for (
                let i = 0;
                i < this.unirepConfig.numEpochKeyNoncePerEpoch;
                i++
            ) {
                const tmp = genEpochKey(
                    identityNullifier,
                    epoch,
                    i,
                    this.unirepConfig.epochTreeDepth
                )
                    .toString(16)
                    .padStart(this.unirepConfig.epochTreeDepth / 4, '0')
                epks.push(tmp)
            }
            return epks
        }
        this.allEpks = [] as string[]
        for (let x = 1; x <= this.currentEpoch; x++) {
            this.allEpks.push(...getEpochKeys(x))
        }
    }

    private getEpochKey(
        epkNonce: number,
        identityNullifier: any,
        epoch: number
    ) {
        const epochKey = genEpochKey(
            identityNullifier,
            epoch,
            epkNonce,
            this.unirepConfig.epochTreeDepth
        )
        return epochKey.toString(16)
    }

    async loadReputation() {
        if (!this.id || !this.userState) return { posRep: 0, negRep: 0 }

        const rep = await this.userState.getRepByAttester(
            BigInt(this.unirepConfig.attesterId)
        )
        this.reputation = Number(rep.posRep) - Number(rep.negRep)
        return rep
    }

    async getAirdrop() {
        if (!this.id || !this.userState) throw new Error('Identity not loaded')
        await this.unirepConfig.loadingPromise
        const unirepSocial = new ethers.Contract(
            this.unirepConfig.unirepSocialAddress,
            config.UNIREP_SOCIAL_ABI,
            config.DEFAULT_ETH_PROVIDER
        )
        // generate an airdrop proof
        const attesterId = this.unirepConfig.attesterId
        const { proof, publicSignals } =
            await this.userState.genUserSignUpProof(BigInt(attesterId))

        const epk = genEpochKey(
            this.id.identityNullifier,
            await this.userState.getUnirepStateCurrentEpoch(),
            0
        )
        const gotAirdrop = await unirepSocial.isEpochKeyGotAirdrop(epk)
        if (gotAirdrop) {
            return {
                error: 'The epoch key has been airdropped.',
                transaction: undefined,
            }
        }

        const apiURL = makeURL('airdrop', {})
        const r = await fetch(apiURL, {
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                proof,
                publicSignals,
            }),
            method: 'POST',
        })
        const { error, transaction } = await r.json()
        const { blockNumber } =
            await config.DEFAULT_ETH_PROVIDER.waitForTransaction(transaction)
        await this.userState.waitForSync(blockNumber)
        await this.loadReputation()
        return { error, transaction }
    }

    async checkInvitationCode(invitationCode: string): Promise<boolean> {
        // check the code first but don't delete it until we signup --> related to backend
        const apiURL = makeURL(`genInvitationCode/${invitationCode}`, {})
        const r = await fetch(apiURL)
        if (!r.ok) return false
        return true
    }

    private async _hasSignedUp(identity: string) {
        const unirepConfig = (UnirepContext as any)._currentValue
        await unirepConfig.loadingPromise
        const id = new ZkIdentity(Strategy.SERIALIZED, identity)
        const commitment = id.genIdentityCommitment()
        return unirepConfig.unirep.hasUserSignedUp(commitment)
    }

    async signUp(invitationCode: string) {
        if (this.id) {
            throw new Error('Identity already exists!')
        }
        const unirepConfig = (UnirepContext as any)._currentValue
        await unirepConfig.loadingPromise

        const id = new ZkIdentity()
        await this.setIdentity(id)
        if (!this.id) throw new Error('Iden is not set')
        this.save()

        const commitment = id
            .genIdentityCommitment()
            .toString(16)
            .padStart(64, '0')

        const serializedIdentity = id.serializeIdentity()
        const epk1 = this.getEpochKey(
            0,
            (this.id as any).identityNullifier,
            this.currentEpoch
        )

        // call server user sign up
        const apiURL = makeURL('signup', {
            commitment: commitment,
            epk: epk1,
            invitationCode,
        })
        const r = await fetch(apiURL)
        const { epoch, transaction, error } = await r.json()
        if (error) {
            this.id = undefined
            this.userState = undefined
            throw error
        }
        const { blockNumber } =
            await config.DEFAULT_ETH_PROVIDER.waitForTransaction(transaction)
        // this.initialSyncFinalBlock = blockNumber
        await this.calculateAllEpks()
        // start the daemon later so the signup ui isn't slow
        await this.userState?.start()
        return {
            i: serializedIdentity,
            c: commitment,
            epoch,
            blockNumber,
        }

        // return await this.updateUser(epoch)
    }

    async login(idInput: string) {
        const hasSignedUp = await this._hasSignedUp(idInput)
        if (!hasSignedUp) return false

        await this.setIdentity(idInput)
        await this.calculateAllEpks()
        if (!this.userState) {
            throw new Error('User state is not set')
        }
        await this.userState.start()
        this.userState.waitForSync().then(() => {
            this.loadReputation()
            this.save()
        })
        return true
    }

    async logout() {
        console.log('log out')
        if (this.userState) {
            await this.userState.stop()
        }
        this.id = undefined
        this.allEpks = [] as string[]
        this.reputation = 0
        this.spent = 0
        this.save()
    }

    async genRepProof(proveKarma: number, epkNonce: number, minRep = 0) {
        if (epkNonce >= this.unirepConfig.numEpochKeyNoncePerEpoch) {
            throw new Error('Invalid epk nonce')
        }
        const [currentEpoch] = await Promise.all([
            this.loadCurrentEpoch(),
            this.loadReputation(),
        ])
        const epk = this.currentEpochKeys[epkNonce]

        if (this.spent === -1) {
            throw new Error('All nullifiers are spent')
        }
        if (this.spent + Math.max(proveKarma, minRep) > this.reputation) {
            throw new Error('Not enough reputation')
        }
        const nonceList = [] as BigInt[]
        for (let i = 0; i < proveKarma; i++) {
            nonceList.push(BigInt(this.spent + i))
        }
        for (
            let i = proveKarma;
            i < this.unirepConfig.maxReputationBudget;
            i++
        ) {
            nonceList.push(BigInt(-1))
        }
        const proveGraffiti = BigInt(0)
        const graffitiPreImage = BigInt(0)
        if (!this.userState) throw new Error('User state not initialized')
        const { proof, publicSignals } =
            await this.userState.genProveReputationProof(
                BigInt(this.unirepConfig.attesterId),
                epkNonce,
                minRep,
                proveGraffiti,
                graffitiPreImage,
                nonceList
            )

        this.save()
        return { epk, proof, publicSignals, currentEpoch }
    }

    async userStateTransition() {
        if (!this.userState) {
            throw new Error('User state not initialized')
        }
        const results = await this.userState.genUserStateTransitionProofs()
        const r = await fetch(makeURL('userStateTransition'), {
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                results,
                fromEpoch: this.userState.latestTransitionedEpoch,
            }),
            method: 'POST',
        })
        const { transaction, error } = await r.json()

        if (error && error.length > 0) {
            console.log(error)
        } else {
            await this.loadCurrentEpoch()
            await this.calculateAllEpks()
            await this.loadReputation()
        } // store user state in local storage

        return { error, transaction }
    }

    async attestationSubmitted(event: any) {
        const epochKey = ethers.BigNumber.from(event.topics[2])
        const decodedData = this.unirepConfig.unirep.interface.decodeEventLog(
            'AttestationSubmitted',
            event.data
        )
        const attestation = new Attestation(
            BigInt(decodedData.attestation.attesterId),
            BigInt(decodedData.attestation.posRep),
            BigInt(decodedData.attestation.negRep),
            BigInt(decodedData.attestation.graffiti),
            BigInt(decodedData.attestation.signUp)
        )
        const normalizedEpk = epochKey
            .toHexString()
            .replace('0x', '')
            .padStart(this.unirepConfig.epochTreeDepth / 4, '0')
        if (this.currentEpochKeys.indexOf(normalizedEpk) !== -1) {
            this.spent += Number(attestation.negRep)
        }
    }

    async epochEnded(event: any) {
        await this.loadReputation()
        await this.calculateAllEpks()
        this.spent = 0
    }
}

export default createContext(new User())
