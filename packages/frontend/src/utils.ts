import { genIdentityCommitment, unSerialiseIdentity } from '@unirep/crypto'
import { genEpochKey } from '@unirep/unirep'
import * as config from './config'
import { Record, Post, DataType, Vote, Comment, QueryType } from './constants'
import UnirepContext from './context/Unirep'
import { ActionType } from './context/Queue'

export const shortenEpochKey = (epk: string) => {
    return `${epk.slice(0, 4)}...${epk.slice(-4)}`
}

const decodeIdentity = (identity: string) => {
    try {
        const id = unSerialiseIdentity(identity)
        const commitment = genIdentityCommitment(id)
        return { id, commitment, identityNullifier: id.identityNullifier }
    } catch (e) {
        console.log('Incorrect Identity format\n', e)
        return {
            id: BigInt(0),
            commitment: BigInt(0),
            identityNullifier: BigInt(0),
        }
    }
}

const getEpochKey = (
    epkNonce: number,
    identityNullifier: any,
    epoch: number
) => {
    const unirepConfig = (UnirepContext as any)._currentValue
    if (!unirepConfig.loaded) throw new Error('Unirep config not loaded')
    const epochKey = genEpochKey(
        identityNullifier,
        epoch,
        epkNonce,
        unirepConfig.epochTreeDepth
    )

    return epochKey.toString(16)
}

const getEpochKeys = (identity: string, epoch: number) => {
    const unirepConfig = (UnirepContext as any)._currentValue
    if (!unirepConfig.loaded) throw new Error('Unirep config not loaded')
    const { identityNullifier } = decodeIdentity(identity)
    const epks: string[] = []
    for (let i = 0; i < unirepConfig.numEpochKeyNoncePerEpoch; i++) {
        const tmp = getEpochKey(i, identityNullifier, epoch)
        epks.push(tmp)
    }
    return epks
}

export const makeURL = (action: string, data: any = {}) => {
    const params = new URLSearchParams(data)
    return `${config.SERVER}/api/${action}?${params}`
}

export const getRecords = async (epks: string[], identity: string) => {
    const unirepConfig = (UnirepContext as any)._currentValue
    await unirepConfig.loadingPromise
    const { commitment } = decodeIdentity(identity)

    const commitmentAPIURL = makeURL(`records`, { commitment })
    const paramStr = epks.join('_')
    const apiURL = makeURL(`records/${paramStr}`, {})
    console.log(apiURL)

    const getCommitment = fetch(commitmentAPIURL)
        .then((response) => response.json())
        .then((data) => {
            if (data.length === 0) return
            const signupRecord: Record = {
                action: ActionType.Signup,
                from: 'SignUp Airdrop',
                to: data[0].to,
                upvote: unirepConfig.airdroppedReputation,
                downvote: 0,
                epoch: data[0].epoch,
                time: Date.parse(data[0].created_at),
                data_id: '',
                content: '',
            }
            return signupRecord
        }) as Promise<Record>

    const getGeneralRecords = fetch(apiURL)
        .then((response) => response.json())
        .then((data) => {
            const records: Record[] = []
            for (let i = 0; i < data.length; i++) {
                const record: Record = {
                    action: data[i].action,
                    from: data[i].from,
                    to: data[i].to,
                    upvote: data[i].upvote,
                    downvote: data[i].downvote,
                    epoch: data[i].epoch,
                    time: Date.parse(data[i].created_at),
                    data_id: data[i].data,
                    content: data[i].content,
                }
                records.unshift(record)
            }
            return records
        }) as Promise<Record[]>

    const allRecords = await Promise.all([getCommitment, getGeneralRecords])

    return allRecords.flat()
}

export const convertDataToComment = (data: any) => {
    const comment = {
        type: DataType.Comment,
        id: data.transactionHash,
        post_id: data.postId,
        content: data.content,
        // votes,
        upvote: data.posRep,
        downvote: data.negRep,
        epoch_key: data.epochKey,
        username: '',
        post_time: Date.parse(data.created_at),
        reputation: data.minRep,
        current_epoch: data.epoch,
        proofIndex: data.proofIndex,
    }

    return comment
}

export const convertDataToPost = (data: any) => {
    const post: Post = {
        type: DataType.Post,
        id: data.transactionHash,
        title: data.title,
        content: data.content,
        // votes,
        upvote: data.posRep,
        downvote: data.negRep,
        epoch_key: data.epochKey,
        username: '',
        post_time: Date.parse(data.created_at),
        reputation: data.minRep,
        commentCount: data.commentCount,
        current_epoch: data.epoch,
        proofIndex: data.proofIndex,
    }

    return post
}

export const getPostsByQuery = async (
    query: QueryType,
    lastRead: string = '0',
    epks: string[] = []
) => {
    const apiURL = makeURL(`post`, { query, lastRead, epks: epks.join('_') })
    console.log(apiURL)

    const r = await fetch(apiURL)
    const data = await r.json()
    return data.map((p: any) => convertDataToPost(p)) as Post[]
}

export const getCommentsByQuery = async (
    query: QueryType,
    lastRead: string = '0',
    epks: string[] = []
) => {
    const apiURL = makeURL(`comment`, { query, lastRead, epks: epks.join('_') })
    console.log(apiURL)
    const r = await fetch(apiURL)
    const data = await r.json()
    return data.map((c: any) => convertDataToComment(c)) as Comment[]
}

export const sentReport = async (issue: string, email: string) => {
    const apiURL = makeURL(`report`, { issue, email })
    const r = await fetch(apiURL)
    return r.ok
}

//////////////////////////////// Admin related //////////////////////////////////
export const checkIsAdminCodeValid = async (code: string) => {
    const apiURL = makeURL('admin', { code })
    const r = await fetch(apiURL)
    return r.ok
}

export const adminLogin = async (id: string, password: string) => {
    const apiURL = makeURL('admin', { id, password })
    const r = await fetch(apiURL)
    if (!r.ok) return ''
    return r.json()
}

export const genInvitationCode = async (code: string) => {
    const apiURL = makeURL('genInvitationCode', { code })
    const r = await fetch(apiURL)
    if (!r.ok) return ''
    return r.json()
}

export const getLatestBlock = async () => {
    const apiURL = makeURL('block')
    const r = await fetch(apiURL)
    if (!r.ok) return ''
    const data = await r.json()
    return data.blockNumber
}
