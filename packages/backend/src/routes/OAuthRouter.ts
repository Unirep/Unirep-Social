import { Express } from 'express'
import catchError from '../catchError'
import OAuth from '../oauth'

export default (app: Express) => {
    app.post('/api/twitter/oauth/request_token', catchError(requestToken))
    app.post('/api/twitter/oauth/access_token', catchError(accessToken))
}

const oauthCallback=process.env.FRONTEND_URL ?? 'http://localhost:3000'
const oauth = OAuth(oauthCallback)
const COOKIE_NAME = 'oauth_token'

async function requestToken(req, res) {
    
}

async function accessToken(req, res) {
   
}
