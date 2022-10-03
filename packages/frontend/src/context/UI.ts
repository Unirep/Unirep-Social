import { createContext } from 'react'
import { makeObservable, observable } from 'mobx'

export class UI {
    loadingPromise

    hasBanner: boolean = true
    scrollTop: number = 0
    downloadPrivateKey = false

    constructor() {
        makeObservable(this, {
            hasBanner: observable,
            scrollTop: observable,
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
    }

    setHasBanner(input: boolean) {
        this.hasBanner = input
        window.localStorage.setItem('hasBanner', this.hasBanner.toString())
    }

    setDownloadPrivateKey() {
        this.downloadPrivateKey = true
    }
}

export default createContext(new UI())
