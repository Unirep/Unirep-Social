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
            this.unirep.config(),
        ])
        this.attesterId = +v[0].toString()
        this.postReputation = +v[1].toString()
        this.commentReputation = +v[2].toString()
        this.airdroppedReputation = +v[3].toString()
        const config = v[4]
        //   struct Config {
        //     // circuit config
        //     uint8 globalStateTreeDepth;
        //     uint8 userStateTreeDepth;
        //     uint8 epochTreeDepth;
        //     uint256 numEpochKeyNoncePerEpoch;
        //     uint256 maxReputationBudget;
        //     uint256 numAttestationsPerProof;
        //     // contract config
        //     uint256 epochLength;
        //     uint256 attestingFee;
        //     uint256 maxUsers;
        //     uint256 maxAttesters;
        // }

        this.globalStateTreeDepth = +config.globalStateTreeDepth
        this.userStateTreeDepth = +config.userStateTreeDepth
        this.epochTreeDepth = +config.epochTreeDepth
        this.numEpochKeyNoncePerEpoch =
            config.numEpochKeyNoncePerEpoch.toNumber()
        this.maxReputationBudget = config.maxReputationBudget.toNumber()
        //
        this.epochLength = config.epochLength.toNumber()
        this.attestingFee = config.attestingFee.toNumber()
        this.maxUsers = config.maxUsers.toNumber()
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
