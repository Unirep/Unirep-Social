import * as config from './config'
import { Record } from './constants'
import UnirepContext from './context/Unirep'

export const shortenEpochKey = (epk: string) => {
    if (!epk) return epk
    const hexEpk = BigInt(epk).toString(16).replace('0x', '')
    if (hexEpk.length > 8) return `${hexEpk.slice(0, 4)}...${hexEpk.slice(-4)}`
    else return epk
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
    const unirepConfig = (UnirepContext as any)._currentValue
    await unirepConfig.loadingPromise

    const paramStr = epks.join('_')
    const apiURL = makeURL(`records/${paramStr}`, {})

    // bug: createdAt is NaN in backend
    const getGeneralRecords = fetch(apiURL)
        .then((response) => response.json())
        .then((data) => {
            const records: Record[] = []
            for (let i = 0; i < data.length; i++) {
                const record: Record = {
                    action: data[i].action,
                    from:
                        data[i].from === 'UnirepSocial'
                            ? 'UnirepSocial'
                            : BigInt(data[i].from).toString(),
                    to: BigInt(data[i].to).toString(),
                    upvote: data[i].upvote,
                    downvote: data[i].downvote,
                    epoch: data[i].epoch,
                    createdAt: data[i].createdAt,
                    data: data[i].data,
                    title: data[i].title,
                    content: data[i].content,
                    spentFromSubsidy: data[i].spentFromSubsidy,
                }
                records.unshift(record)
            }
            return records
        }) as Promise<Record[]>

    const allRecords = await Promise.all([getGeneralRecords])

    return allRecords.flat()
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
