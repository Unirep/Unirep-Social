import { ZkIdentity, Strategy } from '@unirep/crypto'
import { genEpochKey } from '@unirep/core'
import * as config from './config'
import { Record, Post, DataType, Vote, Comment, QueryType } from './constants'
import UnirepContext from './context/Unirep'
import { ActionType } from './context/Queue'

export const shortenEpochKey = (epk: string) => {
    if (epk.length > 8) return `${epk.slice(0, 4)}...${epk.slice(-4)}`
    else return epk
}

const decodeIdentity = (identity: string) => {
    try {
        const id = new ZkIdentity(Strategy.SERIALIZED, identity)
        const commitment = id.genIdentityCommitment()
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

export const makeURL = (_action: string, data: any = {}) => {
    const params = new URLSearchParams(data)
    let action = _action
    if (_action.startsWith('/')) {
        action = _action.slice(1)
    }
    return `${config.SERVER}/api/${action}?${params}`
}

export const getRecords = async (epks: string[]) => {
    const epksBase10 = epks.map((epk) => Number('0x' + epk))
    const unirepConfig = (UnirepContext as any)._currentValue
    await unirepConfig.loadingPromise

    const paramStr = epksBase10.join('_')
    const apiURL = makeURL(`records/${paramStr}`, {})
    console.log(apiURL)

    // bug: createdAt is NaN in backend
    const getGeneralRecords = fetch(apiURL)
        .then((response) => response.json())
        .then((data) => {
            const records: Record[] = []
            for (let i = 0; i < data.length; i++) {
                const record: Record = {
                    action: data[i].action,
                    from: parseInt(data[i].from).toString(16),
                    to: parseInt(data[i].to).toString(16),
                    upvote: data[i].upvote,
                    downvote: data[i].downvote,
                    epoch: data[i].epoch,
                    time: Date.parse(data[i].createdAt),
                    data_id: data[i].data,
                    content: data[i].content,
                }
                records.unshift(record)
            }
            return records
        }) as Promise<Record[]>

    const allRecords = await Promise.all([getGeneralRecords])

    return allRecords.flat()
}

export const convertDataToComment = (data: any) => {
    const comment = {
        type: DataType.Comment,
        id: data._id,
        post_id: data.postId,
        content: data.content,
        // votes,
        upvote: data.posRep,
        downvote: data.negRep,
        epoch_key: `${(+data.epochKey).toString(16)}`,
        username: '',
        createdAt: data.createdAt,
        reputation: data.minRep,
        current_epoch: data.epoch,
        proofIndex: data.proofIndex,
        transactionHash: data.transactionHash,
    }

    return comment
}

export const convertDataToPost = (data: any) => {
    const post: Post = {
        type: DataType.Post,
        id: data._id,
        title: data.title,
        content: data.content,
        // votes,
        upvote: data.posRep,
        downvote: data.negRep,
        epoch_key: `${(+data.epochKey).toString(16)}`,
        username: '',
        createdAt: data.createdAt,
        reputation: data.minRep,
        commentCount: data.commentCount,
        current_epoch: data.epoch,
        proofIndex: data.proofIndex,
        transactionHash: data.transactionHash,
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
