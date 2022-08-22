import { Express } from 'express'
import catchError from '../catchError'

export default (app: Express) => {
    app.get('/api/userinfo/:id', catchError(getUserInfo))
    app.post('/api/userInfo', catchError(editUserInfo))
}

async function getUserInfo(req, res) {
    const userCommitment = req.params.id
    const userInfo = await req.db.findOne('UserInfo', {
        where: {
            userCommitment,
        },
    })
    res.json(userInfo)
}

async function editUserInfo(req, res) {
    const { userCommitment, closeBanner } = req.body

    await req.db.update('UserInfo', {
        where: {
            userCommitment,
        },
        update: {
            closeBanner,
        },
    })

    const userinfo = await req.db.findOne('UserInfo', {
        where: { userCommitment },
    })
    res.json(userinfo)
}
