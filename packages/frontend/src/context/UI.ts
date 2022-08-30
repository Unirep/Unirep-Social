import { createContext } from 'react'
import { makeObservable, observable } from 'mobx'

export class UI {
    loadingPromise

    hasBanner: boolean = true
    showBackBtn: boolean = false

    constructor() {
        makeObservable(this, {
            hasBanner: observable,
            showBackBtn: observable,
        })
        if (typeof window !== 'undefined') {
            this.loadingPromise = this.load()
        } else {
            this.loadingPromise = Promise.resolve()
        }

        window.onscroll = () => {
            if (
                document.documentElement.scrollTop >
                104 + window.innerHeight / 2
            ) {
                this.showBackBtn = true
            } else {
                this.showBackBtn = false
            }
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
