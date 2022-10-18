import { createContext } from 'react'
import { makeObservable, observable } from 'mobx'

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
}

export default createContext(new UI())
