import { Express } from 'express'
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
                },
            ],
        },
    })
    const out = await Promise.all(
        records.map(async (record) => {
            if (
                record.action === ActionType.Post ||
                record.action === ActionType.EditPost ||
                record.action === ActionType.DeletePost
            ) {
                const p = await req.db.findOne('Post', {
                    where: { _id: record.data },
                })
                if (!p) return
                return {
                    ...record,
                    title: p.title,
                    content: p.content,
                }
            }
            if (
                record.action === ActionType.Comment ||
                record.action === ActionType.EditComment ||
                record.action === ActionType.DeleteComment
            ) {
                const c = await req.db.findOne('Comment', {
                    where: {
                        _id: record.data,
                    },
                })
                if (!c) return
                return {
                    ...record,
                    content: c.content,
                }
            }
            return record
        })
    )
    res.json(out.filter((o) => !!o))
}
