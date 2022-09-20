import { Express } from 'express'
import { titlePrefix, titlePostfix } from '../constants'
import { ActionType } from '@unirep-social/core'
import catchError from '../catchError'

export default (app: Express) => {
    app.get('/api/records/:epks', catchError(loadRecordsForEpk))
    app.get('/api/records', catchError(loadSignups))
}

async function loadSignups(req, res) {
    const commitment = req.query.commitment
    const signups = await req.db.findMany('UserSignUp', {
        where: {
            commitment: commitment?.toString(),
        },
    })
    res.json(signups)
}

async function loadRecordsForEpk(req, res) {
    const epks = req.params.epks.split('_')
    for (const epk of epks) {
        if (!/^\d+$/.test(epk)) {
            return res.status(422).json({
                error: 'epk must be base 10',
            })
        }
    }
    const records = await req.db.findMany('Record', {
        where: {
            OR: [
                {
                    from: epks,
                },
                {
                    to: epks,
                    action: req.query.spentonly ? ActionType.Vote : undefined,
                },
            ],
        },
    })
    if (req.query.spentonly) {
        const recordsByFrom = records.reduce((acc, val) => {
            return {
                ...acc,
                [val.from]: [...(acc[val.from] || []), val],
            }
        }, {})
        const epkRecords = await req.db.findMany('EpkRecord', {
            where: {
                epk: epks,
            },
        })
        res.json(
            epkRecords.map((r) => ({
                ...r,
                records: recordsByFrom[r.epk] || [],
            }))
        )
    } else {
        const out = await Promise.all(
            records.map(async (record) => {
                if (record.data === '0' || !record.data) return record
                if (record.action === 'Post') {
                    const p = await req.db.findOne('Post', {
                        where: { transactionHash: record.data },
                    })
                    if (!p) return
                    return {
                        ...record,
                        content: `${
                            p.title !== undefined && p.title.length > 0
                                ? titlePrefix + p.title + titlePostfix
                                : ''
                        }${p.content}`,
                    }
                }
                if (record.action === 'Comment') {
                    const c = await req.db.findOne('Comment', {
                        where: {
                            transactionHash: record.data,
                        },
                    })
                    if (!c) return
                    return {
                        ...record,
                        content: c.content,
                    }
                }
            })
        )
        res.json(out.filter((o) => !!o))
    }
}
