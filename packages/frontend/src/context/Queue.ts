import { createContext } from 'react'
import { makeAutoObservable } from 'mobx'
import { nanoid } from 'nanoid'
import { makeURL } from '../utils'
import { DEFAULT_ETH_PROVIDER } from '../config'

export enum LoadingState {
    loading,
    success,
    failed,
    none,
}

export enum ActionType {
    Post = 'Post',
    Comment = 'Comment',
    Vote = 'Vote',
    UST = 'UST',
    Signup = 'Signup',
}

export interface Metadata {
    id?: string
    transactionId?: string
}

interface Status {
    title?: string
    details?: string
}

type OperationFn = (
    updateStatus: (status: Status) => void
) => void | Promise<any>

interface Operation {
    id: string
    fn: OperationFn
    successMessage: string
    failureMessage: string
    type?: ActionType
    metadata?: Metadata
}

interface QueueHistory {
    opId: string
    message: string
    type?: ActionType
    isSuccess?: boolean
    metadata?: Metadata
}

const defaultStatus: Status = {
    title: 'Submitting your content',
    details: `Please wait 'til this transaction complete for creating post, comment, boost, or squash. This is the life of blockchain :P`,
}

export class Queue {
    operations = [] as Operation[]
    histories = [] as QueueHistory[]
    loadingState = LoadingState.none
    latestMessage = ''
    status = defaultStatus
    daemonRunning = false
    activeOp?: Operation

    constructor() {
        makeAutoObservable(this)
        if (typeof window !== 'undefined') {
            this.load()
        }
    }

    async load() {}

    get isLoading() {
        return this.loadingState === LoadingState.loading
    }

    queuedOp(type: ActionType) {
        if (this.activeOp && this.activeOp.type === type) return true
        return !!this.operations.find((o) => o.type === type)
    }

    async afterTx(tx: string) {
        const { blockNumber: target } =
            await DEFAULT_ETH_PROVIDER.waitForTransaction(tx)
        for (;;) {
            const r = await fetch(makeURL('/block'))
            const { blockNumber } = await r.json()
            if (blockNumber >= target) return
            await new Promise((r) => setTimeout(r, 2000))
        }
    }

    addOp(operation: OperationFn, options = {}) {
        this.operations.push({
            id: nanoid(),
            fn: operation,
            ...{
                successMessage: 'Success!',
                failureMessage: 'Error!',
            },
            ...options,
        })
        // TODO: possibly auto queue a UST if needed?
        this.startDaemon()
    }

    removeOp(operation: Operation) {
        this.operations = this.operations.filter((op) => op.id !== operation.id)
    }

    resetLoading() {
        if (this.loadingState !== LoadingState.loading && !this.daemonRunning) {
            this.loadingState = LoadingState.none
            this.latestMessage = ''
        }
    }

    async startDaemon() {
        if (this.daemonRunning) return
        this.daemonRunning = true

        for (;;) {
            const op = this.operations.shift()
            this.activeOp = op
            if (op === undefined) {
                this.loadingState = LoadingState.none
                break
            }
            try {
                this.loadingState = LoadingState.loading
                const data = await op.fn(
                    (s) =>
                        (this.status = {
                            ...defaultStatus,
                            ...s,
                        })
                )
                this.histories.push({
                    opId: op.id,
                    message: op.successMessage,
                    type: op.type,
                    isSuccess: true,
                    metadata: data,
                })
            } catch (err) {
                this.histories.push({
                    opId: op.id,
                    message: op.failureMessage,
                    type: op.type,
                    isSuccess: false,
                    metadata: op.metadata,
                })
                console.log('Error in queue operation', err)
            }
        }
        this.activeOp = undefined
        this.daemonRunning = false
    }
}

export default createContext(new Queue())
