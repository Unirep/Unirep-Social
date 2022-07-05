import { Express } from 'express'
import catchError from '../catchError'

export default (app: Express) => {
    app.get('/api/signin', catchError(signin))
}

async function signin(req, res) {
    // noop
    res.json({})
}
