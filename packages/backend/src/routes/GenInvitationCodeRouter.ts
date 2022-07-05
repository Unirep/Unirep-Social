import { Express } from 'express'
import { ADMIN_SESSION_CODE } from '../constants'
import catchError from '../catchError'
import randomstring from 'randomstring'

export default (app: Express) => {
    app.get('/api/genInvitationCode', catchError(generateCode))
    app.get('/api/genInvitationCode/:ic', catchError(verifyCode))
}

async function generateCode(req, res) {
    if (
        req.query.code !== undefined &&
        req.query.code.toString() === ADMIN_SESSION_CODE
    ) {
        const randomOutput = randomstring.generate(8)
        await req.db.create('InvitationCode', {
            code: randomOutput,
        })
        res.json(randomOutput)
    } else {
        res.status(403).json({ error: 'No available authentications' })
    }
}

async function verifyCode(req, res) {
    if (req.params.ic === ADMIN_SESSION_CODE) {
        res.status(204).end()
        return
    }
    const code = await req.db.findOne('InvitationCode', {
        where: {
            code: req.params.ic,
        },
    })
    if (!code) {
        console.log('code is null')
        res.status(403).json({ error: 'Not available invitation code' })
    } else {
        res.json({})
    }
}
