import { createContext } from 'react'
import { makeAutoObservable } from 'mobx'
import { ethers } from 'ethers'
import { SERVER, UNIREP_SOCIAL_ABI } from '../config'

export class UnirepConfig {
    unirepAddress = ''
    unirepSocialAddress = ''
    provider = null as any as ethers.providers.Provider
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
    unirepSocial = null as any as ethers.Contract

    loadingPromise
    loaded = false

    constructor() {
        makeAutoObservable(this)
        this.loadingPromise = this.load()
    }

    async load() {
        const url = new URL(`/api/config`, SERVER)
        const {
            unirepAddress,
            unirepSocialAddress,
            ethProvider,
            attesterId,
            postReputation,
            commentReputation,
            subsidy,
            maxReputationBudget,
            epochLength,
            startTimestamp,
            stateTreeDepth,
            epochTreeDepth,
            fieldCount,
            sumFieldCount,
            numEpochKeyNoncePerEpoch,
        } = await fetch(url.toString()).then((r) => r.json())
        this.provider = new ethers.providers.JsonRpcProvider(ethProvider)
        this.unirepAddress = unirepAddress
        this.unirepSocialAddress = unirepSocialAddress
        // now load the contract specifics
        this.unirepSocial = new ethers.Contract(
            unirepSocialAddress,
            UNIREP_SOCIAL_ABI,
            this.provider
        )
        this.attesterId = attesterId
        this.postReputation = postReputation
        this.commentReputation = commentReputation
        this.subsidy = subsidy
        this.maxReputationBudget = maxReputationBudget
        this.epochLength = epochLength

        this.stateTreeDepth = stateTreeDepth
        this.epochTreeDepth = epochTreeDepth
        this.fieldCount = fieldCount
        this.sumFieldCount = sumFieldCount
        this.numEpochKeyNoncePerEpoch = numEpochKeyNoncePerEpoch
        this.startTimestamp = startTimestamp
        this.loaded = true
    }

    async currentEpoch() {
        const url = new URL(`/api/epoch`, SERVER)
        const { epoch } = await fetch(url.toString()).then((r) => r.json())
        return epoch
    }
}

export default createContext(new UnirepConfig())
