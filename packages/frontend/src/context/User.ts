import { createContext } from 'react'
import { makeObservable, observable, computed, runInAction } from 'mobx'

import * as config from '../config'
import { ActionType, Record, Username } from '../constants'
import { ethers } from 'ethers'
import { genEpochKey, stringifyBigInts } from '@unirep/utils'
import { Identity } from '@semaphore-protocol/identity'
import { makeURL } from '../utils'
import { schema } from '@unirep/core'
import { Prover } from '@unirep/circuits'
import { SocialUserState } from '@unirep-social/core'
import prover from './prover'
import UnirepContext from './Unirep'
import { DB, IndexedDBConnector } from 'anondb/web'
import aes from 'aes-js'

export class User {
    id?: Identity
    allEpks = [] as string[]
    currentEpoch = 0
    reputation = 0
    subsidyReputation = 0
    unirepConfig = (UnirepContext as any)._currentValue
    spent = 0
    recordsByEpk = {} as { [epk: string]: Record[] }
    latestTransitionedEpoch?: number
    loadingPromise
    userState?: SocialUserState
    username = {} as Username
    chainId = 0

    syncStartBlock: any
    latestProcessedBlock: any
    isInitialSyncing = true
    initialSyncFinalBlock = Infinity

    constructor() {
        makeObservable(this, {
            userState: observable,
            currentEpoch: observable,
            reputation: observable,
            netReputation: computed,
            subsidyReputation: observable,
            spent: observable,
            currentEpochKeys: computed,
            allEpks: observable,
            syncPercent: computed,
            syncStartBlock: observable,
            initialSyncFinalBlock: observable,
            latestProcessedBlock: observable,
            isInitialSyncing: observable,
            id: observable,
            latestTransitionedEpoch: observable,
            needsUST: computed,
        })
        if (typeof window !== 'undefined') {
            this.loadingPromise = this.load()
        } else {
            this.loadingPromise = Promise.resolve()
        }
    }

    get spendableReputation() {
        return this.reputation - this.spent + this.subsidyReputation
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
            const id = new Identity(storedIdentity)
            await this.loadCurrentEpoch()
            await this.setIdentity(id)
            await this.loadReputation()
            await this.calculateAllEpks()
            await this.loadRecords()
            await this.startSync()
            await this.updateLatestTransitionedEpoch()
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
            window.localStorage.setItem('identity', this.id.toString())
        }
    }

    async loadCurrentEpoch() {
        const url = makeURL('epoch')
        const { epoch } = await fetch(url.toString()).then((r) => r.json())
        this.currentEpoch = epoch
        return epoch
    }

    calcEpoch() {
        const now = Math.floor(+new Date() / 1000)
        const current = Math.floor(
            (now - this.unirepConfig.startTimestamp) /
                this.unirepConfig.epochLength
        )
        return current
    }

    async loadRecords() {
        const apiURL = makeURL(`records/${this.allEpks.join('_')}`, {})
        const res = await fetch(apiURL)
        if (!res || res.status === 404) {
            throw new Error('load records from server error')
        }

        const data = await res.json()
        const rawRecords = data.map((r: Record) => {
            return {
                ...r,
                from:
                    r.from === 'UnirepSocial'
                        ? 'UnirepSocial'
                        : BigInt(r.from).toString(),
                to: BigInt(r.to).toString(),
            }
        })

        this.recordsByEpk = {} // maybe it's not a good solution
        for (const r of rawRecords) {
            let epkOfRecord: string
            if (this.allEpks.indexOf(r.to) !== -1) {
                epkOfRecord = r.to
            } else if (this.allEpks.indexOf(r.from) !== -1) {
                epkOfRecord = r.from
            } else {
                console.log('this records is not belong to this user:', r)
                continue
            }

            // classify by epoch keys
            if (!this.recordsByEpk[epkOfRecord]) {
                this.recordsByEpk[epkOfRecord] = []
            }
            this.recordsByEpk[epkOfRecord].unshift(r)

            if (r.action === ActionType.SetUsername) {
                if (r.epoch < this.currentEpoch) {
                    // records are sorted by time, so the latest one from previous epochs is also the preImage
                    this.username = {
                        oldUsername: r.data,
                        username: r.data,
                        epoch: r.epoch,
                    }
                } else {
                    // if same epoch, should decide whether there is old username or not
                    if (this.username.username) {
                        this.username = {
                            oldUsername: this.username.oldUsername,
                            username: r.data,
                            epoch: r.epoch,
                        }
                    } else {
                        this.username = {
                            oldUsername: '0',
                            username: r.data,
                            epoch: r.epoch,
                        }
                    }
                }
            }
        }

        // calculate rep spent of this epoch
        let rawSpent = 0
        for (var i = 0; i < rawRecords.length; i++) {
            if (
                this.currentEpochKeys.indexOf(rawRecords[i].from) !== -1 &&
                !rawRecords[i].spentFromSubsidy
            ) {
                rawSpent =
                    rawSpent + rawRecords[i].upvote + rawRecords[i].downvote
            }
        }
        this.spent = rawSpent
    }

    get currentEpochKeys() {
        return Array(this.unirepConfig.numEpochKeyNoncePerEpoch)
            .fill(null)
            .map((_, i) => {
                if (!this.id) throw new Error('No id set')
                return genEpochKey(
                    this.id.secret,
                    this.unirepConfig.unirepSocialAddress,
                    BigInt(this.currentEpoch),
                    i,
                    this.chainId
                ).toString()
            })
    }

    get identity() {
        if (!this.id) return undefined
        const serializedIdentity = this.id.toString()
        return serializedIdentity
    }

    get needsUST() {
        if (!this.userState) return false

        const currentEpoch = this.calcEpoch()
        const latestEpoch = this.latestTransitionedEpoch ?? this.currentEpoch
        return currentEpoch > latestEpoch
    }

    get syncPercent() {
        if (!this.latestProcessedBlock) {
            return 0
        }
        return (
            (100 * (this.latestProcessedBlock - this.syncStartBlock)) /
            (this.initialSyncFinalBlock - this.syncStartBlock)
        )
    }

    async startSync() {
        this.isInitialSyncing = true
        const syncState = await this.userState?.sync.db.findOne(
            'SynchronizerState',
            {
                where: {},
            }
        )
        const latestBlock = await config.DEFAULT_ETH_PROVIDER.getBlockNumber()
        this.syncStartBlock = syncState?.latestCompleteBlock ?? 0
        this.initialSyncFinalBlock = latestBlock
        await this.userState?.waitForSync()
        this.userState?.sync.on('processedEvent', (event) => {
            this.latestProcessedBlock = event.blockNumber
        })
        this.userState?.waitForSync(this.initialSyncFinalBlock).then(() => {
            this.isInitialSyncing = false
        })
    }

    async setIdentity(identity: string | Identity) {
        if (this.userState) {
            throw new Error('Identity already set, change is not supported')
        }
        if (typeof identity === 'string') {
            this.id = new Identity(identity)
        } else {
            this.id = identity
        }
        const db = await IndexedDBConnector.create(schema)
        this.userState = new SocialUserState({
            db: db as DB,
            provider: this.unirepConfig.provider,
            unirepAddress: this.unirepConfig.unirepAddress,
            attesterId: this.unirepConfig.unirepSocialAddress,
            id: this.id,
            unirepSocialAddress: this.unirepConfig.unirepSocialAddress,
            prover: prover as Prover,
        })
        await this.userState.start()
        await this.userState.waitForSync()
        this.chainId = this.userState.chainId
        const [EpochEnded] = this.unirepConfig.unirep.filters.EpochEnded()
            .topics as string[]
        this.userState.sync.on(EpochEnded, this.epochEnded.bind(this))
    }

    async updateLatestTransitionedEpoch() {
        if (!this.userState) throw new Error('No user state')
        this.latestTransitionedEpoch =
            await this.userState.latestTransitionedEpoch()
    }

    async calculateAllEpks() {
        if (!this.id) throw new Error('No identity loaded')
        await this.unirepConfig.loadingPromise
        const { secret } = this.id
        const getEpochKeys = (epoch: number) => {
            const epks: string[] = []
            for (
                let i = 0;
                i < this.unirepConfig.numEpochKeyNoncePerEpoch;
                i++
            ) {
                const tmp = genEpochKey(
                    secret,
                    this.unirepConfig.unirepSocialAddress,
                    epoch,
                    i,
                    this.chainId
                ).toString()
                epks.push(tmp)
            }
            return epks
        }
        this.allEpks = [] as string[]
        for (let x = 0; x <= this.currentEpoch; x++) {
            this.allEpks.push(...getEpochKeys(x))
        }
    }

    async loadReputation() {
        if (!this.id || !this.userState) return { posRep: 0, negRep: 0 }

        const epoch = await this.loadCurrentEpoch()
        const subsidy = this.unirepConfig.subsidy
        // see the unirep social circuits for more info about this
        // the subsidy key is an epoch key that doesn't have the modulus applied
        // it uses nonce == maxNonce + 1
        const subsidyKey = genEpochKey(
            this.id.secret,
            this.unirepConfig.unirepSocialAddress,
            epoch,
            0,
            this.chainId
        )
        const spentSubsidy = await this.unirepConfig.unirepSocial.subsidies(
            epoch,
            subsidyKey
        )
        this.subsidyReputation = subsidy - Number(spentSubsidy)
        const rep = await this.userState.getData(epoch - 1)
        this.reputation = Number(rep[0]) - Number(rep[1])
        return rep
    }

    async getAirdrop() {
        if (!this.id || !this.userState) throw new Error('Identity not loaded')
        if (this.reputation >= 0) throw new Error('do not need to airdrop')

        await this.unirepConfig.loadingPromise

        // generate an airdrop proof
        await this.userState.waitForSync()
        const negRep = Math.min(
            Math.abs(this.reputation),
            this.unirepConfig.subsidy
        )

        const negRepProof = await this.userState.genActionProof({
            maxRep: negRep,
        })

        // Check if the user already got airdropped
        const currentEpoch = await this.userState?.sync.loadCurrentEpoch()
        const subsidyKey = negRepProof.epochKey

        const spentSubsidy = await this.unirepConfig.unirepSocial.subsidies(
            currentEpoch,
            subsidyKey
        )
        if (spentSubsidy.toNumber() > 0) {
            return {
                error: 'The epoch key has been airdropped',
                transaction: undefined,
            }
        }

        const apiURL = makeURL('airdrop', {})
        const r = await fetch(apiURL, {
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                proof: negRepProof.proof,
                publicSignals: negRepProof.publicSignals.map((n) =>
                    n.toString()
                ),
                negRep,
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

    private async _hasSignedUp(identity: string | Identity) {
        const unirepConfig = (UnirepContext as any)._currentValue
        await unirepConfig.loadingPromise
        const id =
            typeof identity === 'string' ? new Identity(identity) : identity
        const apiURL = makeURL(`signup/${id.commitment.toString()}`, {})
        const r = await fetch(apiURL)
        if (!r.ok) return false
        const { result } = await r.json()
        return result
    }

    async signUp() {
        if (this.id) {
            return { error: 'Identity already exists!' }
            // throw new Error('Identity already exists!')
        }
        const unirepConfig = (UnirepContext as any)._currentValue
        await unirepConfig.loadingPromise

        const id = new Identity()
        await this.setIdentity(id)
        if (!this.id) {
            return { error: 'Iden is not set' }
            // throw new Error('Iden is not set')
        }
        this.save()

        if (!this.userState) throw new Error('User state not initialized')
        await this.userState.waitForSync()
        const { publicSignals: _publicSignals, proof } =
            await this.userState.genUserSignUpProof()
        const publicSignals = _publicSignals.map((n) => n.toString())
        // call server user sign up

        const apiURL = makeURL('signup')
        const r = await fetch(apiURL, {
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                publicSignals,
                proof,
            }),
            method: 'POST',
        })
        const { epoch, transaction, error } = await r.json()
        if (error) {
            this.id = undefined
            this.userState = undefined
            return { error }
            // throw error
        }
        const { blockNumber } =
            await config.DEFAULT_ETH_PROVIDER.waitForTransaction(transaction)
        // this.initialSyncFinalBlock = blockNumber
        await this.calculateAllEpks()
        // start the daemon later so the signup ui isn't slow
        await this.startSync()
        await this.loadReputation()
        return {
            i: id.toString(),
            c: id.commitment,
            epoch,
            blockNumber,
        }

        // return await this.updateUser(epoch)
    }

    async login(idInput: string | Identity) {
        const hasSignedUp = await this._hasSignedUp(idInput)
        if (!hasSignedUp) return false

        await this.loadCurrentEpoch()
        await this.setIdentity(idInput)
        await this.calculateAllEpks()
        if (!this.userState) {
            throw new Error('User state is not set')
        }
        await this.startSync()
        await this.userState.waitForSync()
        await this.loadReputation()
        await this.updateLatestTransitionedEpoch()
        await this.loadRecords()
        this.save()

        return true
    }

    async logout() {
        if (this.userState) {
            this.userState.stop()
            await this.userState.sync.db.close()
            await this.userState.sync.db.closeAndWipe()
            this.userState = undefined
        }
        runInAction(() => {
            this.id = undefined
            this.allEpks = [] as string[]
            this.reputation = 0
            this.spent = 0
        })
        window.localStorage.removeItem('identity')
    }

    async genSubsidyProof(
        minRep = 0,
        notEpochKey: string | bigint = '0',
        username?: string
    ) {
        const currentEpoch = await this.loadCurrentEpoch()
        if (!this.userState) throw new Error('User state not initialized')

        let graffiti = username
        if (username)
            graffiti = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(username))
        await this.userState.waitForSync()
        const epkNonce = 0
        const revealNonce = true
        const { proof, publicSignals: _publicSignals } =
            await this.userState.genActionProof({
                epkNonce,
                revealNonce,
                notEpochKey,
                minRep,
                graffiti,
            })
        const publicSignals = _publicSignals.map((n) => n.toString())

        return { proof, publicSignals, currentEpoch }
    }

    async genRepProof(
        proveKarma: number,
        epkNonce: number,
        minRep = 0,
        username?: string
    ) {
        if (epkNonce >= this.unirepConfig.numEpochKeyNoncePerEpoch) {
            throw new Error('Invalid epk nonce')
        }
        const [currentEpoch] = await Promise.all([
            this.loadCurrentEpoch(),
            this.loadReputation(),
        ])
        const epk = this.currentEpochKeys[epkNonce]
        let graffiti = username
        if (username)
            graffiti = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(username))

        if (this.spent === -1) {
            throw new Error('All nullifiers are spent')
        }
        if (this.spent + Math.max(proveKarma, minRep) > this.reputation) {
            throw new Error('Not enough reputation')
        }
        if (!this.userState) throw new Error('User state not initialized')

        await this.userState.waitForSync()
        const { proof, publicSignals: _publicSignals } =
            await this.userState.genActionProof({
                graffiti,
                spentRep: proveKarma,
                minRep,
                epkNonce,
            })
        const publicSignals = _publicSignals.map((n) => n.toString())

        this.save()
        return { epk, proof, publicSignals, currentEpoch }
    }

    async userStateTransition() {
        if (!this.userState) {
            throw new Error('User state not initialized')
        }

        await this.userState.waitForSync()
        const toEpoch = this.calcEpoch()
        const results = await this.userState.genUserStateTransitionProof({
            toEpoch,
        })
        const r = await fetch(makeURL('userStateTransition'), {
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                results: stringifyBigInts(results),
                fromEpoch: this.userState.latestTransitionedEpoch,
            }),
            method: 'POST',
        })
        const { transaction, error } = await r.json()

        if (error && error.length > 0) {
            console.error(error)
        }

        return { error, transaction }
    }

    async epochEnded(event: any) {
        await this.loadReputation()
        await this.calculateAllEpks()
        this.spent = 0
    }

    async decrypt(password: string, { data, iv, salt }: any) {
        const saltBytes = ethers.utils.arrayify(salt)
        const ivBytes = ethers.utils.arrayify(iv)
        const passwordBytes = aes.utils.utf8.toBytes(password)
        const passwordHash = ethers.utils.sha256([
            ...saltBytes,
            ...passwordBytes,
        ])
        const passwordHashBytes = ethers.utils.arrayify(passwordHash)
        const aesCbc = new aes.ModeOfOperation.cbc(passwordHashBytes, ivBytes)
        const dataBytes = ethers.utils.arrayify(data)
        const decryptedBytes = aesCbc.decrypt(dataBytes)
        // now lets slice it up

        const trapdoor = BigInt(
            ethers.utils.hexlify(decryptedBytes.slice(0, 32))
        )
        const nullifier = BigInt(
            ethers.utils.hexlify(decryptedBytes.slice(32, 64))
        )
        // now lets build a zk identity from it
        const id = new Identity()
        // TODO: add a new zk identity strategy for manually settings this more cleanly
        ;(id as any)._identityNullifier = nullifier
        ;(id as any)._identityTrapdoor = trapdoor
        ;(id as any)._secret = [nullifier, trapdoor]
        return id
    }

    // encrypt the current id using aes 256 cbc and bcrypt
    async encrypt(password: string) {
        if (!this.id) throw new Error('Iden is not set')

        const passwordBytes = aes.utils.utf8.toBytes(password)
        const saltBytes = await ethers.utils.randomBytes(32)
        const passwordHash = ethers.utils.sha256([
            ...saltBytes,
            ...passwordBytes,
        ])
        const passwordHashBytes = ethers.utils.arrayify(passwordHash)
        const iv = ethers.utils.randomBytes(16)
        const aesCbc = new aes.ModeOfOperation.cbc(passwordHashBytes, iv)
        // encode as trapdoor, nullifier, secret
        const hexString = [
            '0x',
            this.id.trapdoor.toString(16).padStart(64, '0'),
            this.id.nullifier.toString(16).padStart(64, '0'),
        ].join('')
        const dataBytes = ethers.utils.arrayify(hexString)
        const encryptedBytes = aesCbc.encrypt(dataBytes)
        const encryptedHex = ethers.utils.hexlify(encryptedBytes)
        return {
            data: encryptedHex,
            iv: ethers.utils.hexlify(iv),
            salt: ethers.utils.hexlify(saltBytes),
        }
    }

    async setUsername(username: string, oldUsername?: string) {
        if (!this.userState) throw new Error('user not login')

        let graffiti = oldUsername
        if (oldUsername)
            graffiti = ethers.utils.hexlify(
                ethers.utils.toUtf8Bytes(oldUsername)
            )

        const epkNonce = 0
        const revealNonce = true

        const usernameProof = await this.userState.genActionProof({
            graffiti,
            epkNonce,
            revealNonce,
        })

        const apiURL = makeURL('usernames', {})
        const r = await fetch(apiURL, {
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                newUsername: username,
                publicSignals: usernameProof.publicSignals.map((n) =>
                    n.toString()
                ),
                proof: usernameProof.proof,
            }),
            method: 'POST',
        })

        const { transaction, error } = await r.json()

        if (!r.ok) {
            return { error }
        }
        return { transaction }
    }
}

export default createContext(new User())
