import { Express } from 'express'
import catchError from '../catchError'

export default (app: Express) => {
    // TODO: make this a POST function
    app.get('/api/report', catchError(createReport))
}

async function createReport(req, res) {
    await req.db.create('Report', {
        issue: req.query.issue,
        email: req.query.email,
    })
    res.status(204).end()
}
