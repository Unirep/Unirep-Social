import { Express } from 'express'
import catchError from '../catchError'
import OAuth from '../oauth'

let tokens = {}

export default (app: Express) => {
    app.post('/api/twitter/oauth/request_token', catchError(requestToken))
    app.post('/api/twitter/oauth/access_token', catchError(accessToken))
}

const oauthCallback=process.env.FRONTEND_URL ?? 'http://localhost:3000'
const oauth = OAuth(oauthCallback)
const COOKIE_NAME = 'oauth_token'

async function requestToken(req, res) {
    const {oauth_token, oauth_token_secret} = await oauth.getOAuthRequestToken();
  
  res.cookie(COOKIE_NAME, oauth_token , {
    maxAge: 15 * 60 * 1000, // 15 minutes
    secure: true,
    httpOnly: true,
    sameSite: true,
  });
  
  tokens[oauth_token] = { oauth_token_secret };
  res.json({ oauth_token });
}

async function accessToken(req, res) {
    try {
        const {oauth_token: req_oauth_token, oauth_verifier} = req.body;
        const oauth_token = req.cookies[COOKIE_NAME];
        const oauth_token_secret = tokens[oauth_token].oauth_token_secret;
        
        if (oauth_token !== req_oauth_token) {
          res.status(403).json({message: "Request tokens do not match"});
          return;
        }
        
        const {oauth_access_token, oauth_access_token_secret} = await oauth.getOAuthAccessToken(oauth_token, oauth_token_secret, oauth_verifier);
        tokens[oauth_token] = { ...tokens[oauth_token], oauth_access_token, oauth_access_token_secret };
        res.json({success: true});
        
      } catch(error) {
        res.status(403).json({message: "Missing access token"});
      } 
}
