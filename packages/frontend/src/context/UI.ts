import { createContext } from 'react'
import { makeObservable, observable, computed } from 'mobx'

import UserContext, { User } from './User'
import EpochContext, { EpochManager } from './EpochManager'
import QueueContext, { Queue } from './Queue'
import { ActionType } from '@unirep-social/core'

export enum EpochStatus {
    syncing,
    doingUST,
    needsUST,
    default,
}

const userContext = (UserContext as any)._currentValue as User
const queue = (QueueContext as any)._currentValue as Queue
const epochManager = (EpochContext as any)._currentValue as EpochManager

export class UI {
    loadingPromise

    hasBanner: boolean = true
    scrollTop: number = 0
    hasDownloadPrivateKey: boolean = false

    constructor() {
        makeObservable(this, {
            hasBanner: observable,
            scrollTop: observable,
            hasDownloadPrivateKey: observable,
            epochStatus: computed,
        })

        if (typeof window !== 'undefined') {
            this.loadingPromise = this.load()
        } else {
            this.loadingPromise = Promise.resolve()
        }

        window.onscroll = () => {
            this.scrollTop = document.documentElement.scrollTop
        }
    }

    // must be called in browser, not in SSR
    async load() {
        const storedHasBanner = window.localStorage.getItem('hasBanner')
        if (storedHasBanner) {
            this.hasBanner = storedHasBanner === 'true'
        }

        const storedHasDownloadPrivateKey = window.localStorage.getItem(
            'hasDownloadPrivateKey'
        )
        if (storedHasDownloadPrivateKey) {
            this.hasDownloadPrivateKey = storedHasDownloadPrivateKey === 'true'
        }
    }

    setHasBanner(input: boolean) {
        this.hasBanner = input
        window.localStorage.setItem('hasBanner', this.hasBanner.toString())
    }

    setDownloadPrivateKey(input: boolean) {
        this.hasDownloadPrivateKey = input
        window.localStorage.setItem(
            'hasDownloadPrivateKey',
            this.hasDownloadPrivateKey.toString()
        )
    }

    uiLogout() {
        window.localStorage.removeItem('hasDownloadPrivateKey')
        window.localStorage.removeItem('hasBanner')
    }

    get epochStatus() {
        if (userContext.isInitialSyncing) {
            return EpochStatus.syncing
        } else if (
            userContext.userState &&
            !userContext.isInitialSyncing &&
            (epochManager.readyToTransition || userContext.needsUST) &&
            !queue.queuedOp(ActionType.UST)
        ) {
            return EpochStatus.needsUST
        } else if (queue.queuedOp(ActionType.UST)) {
            return EpochStatus.doingUST
        } else {
            return EpochStatus.default
        }
    }
}

export default createContext(new UI())
