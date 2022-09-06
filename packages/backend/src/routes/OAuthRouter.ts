import { Express } from 'express'
import catchError from '../catchError'
import OAuth from '../oauth'

let tokens = {}

export default (app: Express) => {
    app.post('/api/twitter/oauth/request_token', catchError(requestToken))
    app.post('/api/twitter/oauth/access_token', catchError(accessToken))
}

const oauthCallback = process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL}/signup`
    : 'http://localhost:3000/signup'
const oauth = OAuth(oauthCallback)

// get oauth_token which only resides in the backend
async function requestToken(req, res) {
    const { oauth_token, oauth_token_secret } =
        (await oauth.getOAuthRequestToken()) as any

    tokens[oauth_token] = { oauth_token_secret }

    console.log('request token:', oauth_token, oauth_token_secret)

    res.json({ oauth_token })
}

async function accessToken(req, res) {
    try {
        const { oauth_token, oauth_verifier } = req.body
        const oauth_token_secret = tokens[oauth_token].oauth_token_secret
        const { oauth_access_token, oauth_access_token_secret } =
            (await oauth.getOAuthAccessToken(
                oauth_token,
                oauth_token_secret,
                oauth_verifier
            )) as any
        tokens[oauth_token] = {
            ...tokens[oauth_token],
            oauth_access_token,
            oauth_access_token_secret,
        }
        res.json({ success: true })
    } catch (error) {
        res.status(403).json('Missing access token')
    }
}
