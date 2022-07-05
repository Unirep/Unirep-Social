import { createContext } from 'react'
import { makeObservable, observable, computed } from 'mobx'
import * as config from '../config'
import { ethers } from 'ethers'
import {
    genIdentity,
    genIdentityCommitment,
    serialiseIdentity,
    unSerialiseIdentity,
    Identity,
} from '@unirep/crypto'
import { UnirepFactory } from '@unirep/unirep-social'
import { makeURL } from '../utils'
import { genEpochKey } from '@unirep/unirep'
import { UnirepState, UserState } from '../overrides/unirep'
import {
    formatProofForVerifierContract,
    formatProofForSnarkjsVerification,
    verifyProof,
} from '@unirep/circuits'
import UnirepContext from './Unirep'
import { Synchronizer } from './Synchronizer'

export class User extends Synchronizer {
    id?: Identity
    allEpks = [] as string[]
    currentEpoch = 0
    reputation = 30
    unirepConfig = (UnirepContext as any)._currentValue
    spent = 0
    loadingPromise

    constructor() {
        super()
        makeObservable(this, {
            currentEpoch: observable,
            reputation: observable,
            spent: observable,
            unirepState: observable,
            userState: observable,
            currentEpochKeys: computed,
            allEpks: observable,
            syncPercent: computed,
            startBlock: observable,
            latestBlock: observable,
            latestProcessedBlock: observable,
            isInitialSyncing: observable,
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
        return this.currentEpoch === this.unirepState?.currentEpoch
    }

    // must be called in browser, not in SSR
    async load() {
        await super.load() // loads the unirep state
        if (!this.unirepState) throw new Error('Unirep state not initialized')
        const storedState = window.localStorage.getItem('user')
        if (storedState) {
            const data = JSON.parse(storedState)
            const id = unSerialiseIdentity(data.id)
            const userState = UserState.fromJSON(data.id, data.userState)
            Object.assign(this, {
                ...data,
                id,
                userState,
                unirepState: userState.getUnirepState(),
            })
            await this.calculateAllEpks()
        }
        if (this.id) {
            this.startDaemon()
            this.waitForSync().then(() => {
                this.loadReputation()
                this.save()
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
        super.save()
        // save user state
        const data = {
            userState: this.userState,
            id: this.identity,
            currentEpoch: this.currentEpoch,
            spent: this.spent,
        }
        if (typeof this.userState?.toJSON(0) === 'string') {
            throw new Error('Invalid user state toJSON return value')
        }
        window.localStorage.setItem('user', JSON.stringify(data))
    }

    async loadCurrentEpoch() {
        await this.unirepConfig.loadingPromise
        const unirepContract = UnirepFactory.connect(
            this.unirepConfig.unirepAddress,
            config.DEFAULT_ETH_PROVIDER
        )
        this.currentEpoch = Number(await unirepContract.currentEpoch())
        return this.currentEpoch
    }

    get currentEpochKeys() {
        return this.allEpks.slice(
            -1 * this.unirepConfig.numEpochKeyNoncePerEpoch
        )
    }

    get identity() {
        if (!this.id) return undefined
        const serializedIdentity = serialiseIdentity(this.id)
        return serializedIdentity
    }

    get needsUST() {
        if (!this.userState) return false
        return this.currentEpoch > this.userState.latestTransitionedEpoch
    }

    setIdentity(identity: string | Identity) {
        if (this.userState) {
            throw new Error('Identity already set, change is not supported')
        }
        if (!this.unirepState) {
            throw new Error('Unirep state is not initialized')
        }
        if (typeof identity === 'string') {
            this.id = unSerialiseIdentity(identity)
        } else {
            this.id = identity
        }
        this.userState = new UserState(this.unirepState, this.id)
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

        const rep = this.userState.getRepByAttester(
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
            this.userState.getUnirepStateCurrentEpoch(),
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
                proof: formatProofForVerifierContract(proof),
                publicSignals,
            }),
            method: 'POST',
        })
        const { error, transaction } = await r.json()
        const { blockNumber } =
            await config.DEFAULT_ETH_PROVIDER.waitForTransaction(transaction)
        await this.waitForSync(blockNumber)
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
        const id = unSerialiseIdentity(identity)
        const commitment = genIdentityCommitment(id)
        return unirepConfig.unirep.hasUserSignedUp(commitment)
    }

    async signUp(invitationCode: string) {
        if (this.id) {
            throw new Error('Identity already exists!')
        }
        const unirepConfig = (UnirepContext as any)._currentValue
        await unirepConfig.loadingPromise

        this.unirepState = new UnirepState({
            globalStateTreeDepth: this.unirepConfig.globalStateTreeDepth,
            userStateTreeDepth: this.unirepConfig.userStateTreeDepth,
            epochTreeDepth: this.unirepConfig.epochTreeDepth,
            attestingFee: this.unirepConfig.attestingFee,
            epochLength: this.unirepConfig.epochLength,
            numEpochKeyNoncePerEpoch:
                this.unirepConfig.numEpochKeyNoncePerEpoch,
            maxReputationBudget: this.unirepConfig.maxReputationBudget,
        })

        if (!this.unirepState) throw new Error('Unirep state not initialized')

        const id = genIdentity()
        this.setIdentity(id)
        if (!this.id) throw new Error('Iden is not set')

        const commitment = genIdentityCommitment(this.id)
            .toString(16)
            .padStart(64, '0')

        const serializedIdentity = serialiseIdentity(this.id)
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
        this.initialSyncFinalBlock = blockNumber
        await this.calculateAllEpks()
        // start the daemon later so the signup ui isn't slow
        this.startDaemon()
        return {
            i: serializedIdentity,
            c: commitment,
            epoch,
        }

        // return await this.updateUser(epoch)
    }

    async login(idInput: string) {
        const hasSignedUp = await this._hasSignedUp(idInput)
        if (!hasSignedUp) return false

        this.unirepState = new UnirepState({
            globalStateTreeDepth: this.unirepConfig.globalStateTreeDepth,
            userStateTreeDepth: this.unirepConfig.userStateTreeDepth,
            epochTreeDepth: this.unirepConfig.epochTreeDepth,
            attestingFee: this.unirepConfig.attestingFee,
            epochLength: this.unirepConfig.epochLength,
            numEpochKeyNoncePerEpoch:
                this.unirepConfig.numEpochKeyNoncePerEpoch,
            maxReputationBudget: this.unirepConfig.maxReputationBudget,
        })

        if (!this.unirepState) throw new Error('Unirep state not initialized')

        this.setIdentity(idInput)
        await this.calculateAllEpks()
        this.startDaemon()
        this.waitForSync().then(() => {
            this.loadReputation()
            this.save()
        })
        return true
    }

    async logout() {
        console.log('log out')
        if (this.daemonRunning) {
            this.daemonRunning = false
            await this.daemonPromise
        }
        this.id = undefined
        this.allEpks = [] as string[]
        this.reputation = 0
        this.spent = 0

        this.init()
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
        const results = await this.userState.genProveReputationProof(
            BigInt(this.unirepConfig.attesterId),
            epkNonce,
            minRep,
            proveGraffiti,
            graffitiPreImage,
            nonceList
        )

        const proof = formatProofForVerifierContract(results.proof)
        const publicSignals = results.publicSignals
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
        const result = await super.attestationSubmitted(event)
        if (!result) return
        const {
            // epoch,
            epochKey,
            spentAmount,
        } = result
        const normalizedEpk = epochKey
            .toHexString()
            .replace('0x', '')
            .padStart(this.unirepConfig.epochTreeDepth / 4, '0')
        if (this.currentEpochKeys.indexOf(normalizedEpk) !== -1) {
            this.spent += Number(spentAmount)
        }
    }

    async epochEnded(event: any) {
        await super.epochEnded(event)
        await this.loadReputation()
        await this.calculateAllEpks()
        this.spent = 0
    }
}

export default createContext(new User())
