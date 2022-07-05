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
    globalStateTreeDepth = 11
    userStateTreeDepth = 5
    epochTreeDepth = 64
    attestingFee = 1
    numEpochKeyNoncePerEpoch = 3
    numAttestationsPerEpochKey = 6
    epochLength = 30
    maxReputationBudget = 10
    maxUsers = 0
    postReputation = 0
    commentReputation = 0
    airdroppedReputation = 0
    attesterId = 0
    unirep = null as any as ethers.Contract
    unirepSocial = null as any as ethers.Contract

    loadingPromise
    loaded = false

    constructor() {
        makeAutoObservable(this)
        this.loadingPromise = this.load()
    }

    async load() {
        const { unirepAddress, unirepSocialAddress } = await fetch(
            `${SERVER}/api/config`
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
        const v = await Promise.all([
            this.unirepSocial.attesterId(),
            this.unirepSocial.postReputation(),
            this.unirepSocial.commentReputation(),
            this.unirepSocial.airdroppedReputation(),
            this.unirep.numEpochKeyNoncePerEpoch(),
            this.unirep.maxReputationBudget(),
            this.unirep.maxUsers(),
            this.unirep.treeDepths(),
            this.unirep.attestingFee(),
            this.unirep.epochLength(),
        ])
        this.attesterId = +v[0].toString()
        this.postReputation = +v[1].toString()
        this.commentReputation = +v[2].toString()
        this.airdroppedReputation = +v[3].toString()
        this.numEpochKeyNoncePerEpoch = +v[4].toString()
        this.maxReputationBudget = +v[5].toString()
        this.maxUsers = +v[6].toString()
        this.globalStateTreeDepth = +v[7].globalStateTreeDepth.toString()
        this.userStateTreeDepth = +v[7].userStateTreeDepth.toString()
        this.epochTreeDepth = +v[7].epochTreeDepth.toString()
        this.attestingFee = +v[8].toString()
        this.epochLength = +v[9].toString()
        this.loaded = true
    }

    async nextEpochTime() {
        await this.loadingPromise
        const lastTransition = await this.unirep.latestEpochTransitionTime()
        return (+lastTransition.toString() + this.epochLength) * 1000
    }

    async currentEpoch() {
        await this.loadingPromise
        return this.unirep.currentEpoch()
    }
}

export default createContext(new UnirepConfig())
