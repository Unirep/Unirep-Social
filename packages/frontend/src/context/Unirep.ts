import { createContext } from 'react'
import { makeAutoObservable } from 'mobx'
import { ethers } from 'ethers'
import {
    SERVER,
    UNIREP_SOCIAL_ABI,
    UNIREP_ABI,
    DEFAULT_ETH_PROVIDER,
} from '../config'

export class UnirepConfig {
    unirepAddress = ''
    unirepSocialAddress = ''
    stateTreeDepth = 12
    epochTreeDepth = 4
    fieldCount = 6
    sumFieldCount = 4
    numEpochKeyNoncePerEpoch = 3
    startTimestamp = +new Date()
    epochLength = 30
    maxReputationBudget = 10
    maxUsers = 0
    postReputation = 0
    commentReputation = 0
    // airdroppedReputation = 0
    attesterId = 0
    subsidy = 0
    unirep = null as any as ethers.Contract
    unirepSocial = null as any as ethers.Contract

    loadingPromise
    loaded = false

    constructor() {
        makeAutoObservable(this)
        this.loadingPromise = this.load()
    }

    async load() {
        const url = new URL(`/api/config`, SERVER)
        const { unirepAddress, unirepSocialAddress } = await fetch(
            url.toString()
        ).then((r) => r.json())
        this.unirepAddress = unirepAddress
        this.unirepSocialAddress = unirepSocialAddress
        // now load the contract specifics
        this.unirep = new ethers.Contract(
            unirepAddress,
            UNIREP_ABI,
            DEFAULT_ETH_PROVIDER
        )
        this.unirepSocial = new ethers.Contract(
            unirepSocialAddress,
            UNIREP_SOCIAL_ABI,
            DEFAULT_ETH_PROVIDER
        )
        const attesterFilter =
            this.unirep.filters.AttesterSignedUp(unirepSocialAddress)

        const v = await Promise.all([
            this.unirepSocial.attesterId(),
            this.unirepSocial.postReputation(),
            this.unirepSocial.commentReputation(),
            // this.unirepSocial.airdroppedReputation(),
            this.unirepSocial.subsidy(),
            this.unirepSocial.maxReputationBudget(),
            this.unirepSocial.epochLength(),
            this.unirep.stateTreeDepth(),
            this.unirep.epochTreeDepth(),
            this.unirep.fieldCount(),
            this.unirep.sumFieldCount(),
            this.unirep.numEpochKeyNoncePerEpoch(),
            this.unirep.queryFilter(attesterFilter),
        ])
        this.attesterId = +v[0].toString()
        this.postReputation = +v[1].toString()
        this.commentReputation = +v[2].toString()
        // this.airdroppedReputation = +v[3].toString()
        this.subsidy = +v[3].toString()
        this.maxReputationBudget = +v[4].toString()
        this.epochLength = +v[5].toNumber()

        this.stateTreeDepth = +v[6].toString()
        this.epochTreeDepth = +v[7].toString()
        this.fieldCount = +v[8].toString()
        this.sumFieldCount = +v[9].toString()
        this.numEpochKeyNoncePerEpoch = +v[10].toString()
        const event = v[11][0]
        const decodedData = this.unirep.interface.decodeEventLog(
            'AttesterSignedUp',
            event.data,
            event.topics
        )
        const { timestamp } = decodedData
        this.startTimestamp = timestamp
        this.loaded = true
    }

    async currentEpoch() {
        await this.loadingPromise
        return this.unirep.attesterCurrentEpoch(this.unirepSocial.address)
    }
}

export default createContext(new UnirepConfig())
