import { createContext } from 'react'
import { makeObservable, observable } from 'mobx'

export class UI {
    loadingPromise

    hasBanner: boolean = true

    constructor() {
        makeObservable(this, {
            hasBanner: observable,
        })
        if (typeof window !== 'undefined') {
            this.loadingPromise = this.load()
        } else {
            this.loadingPromise = Promise.resolve()
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
}

export default createContext(new UI())
