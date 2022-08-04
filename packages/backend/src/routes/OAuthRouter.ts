import catchError from '../catchError'
import {
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    TWITTER_CLIENT_ID,
    TWITTER_REDIRECT_URI,
    GITHUB_REDIRECT_URI,
} from '../constants'
import fetch from 'node-fetch'
import { nanoid } from 'nanoid'
import crypto from 'crypto'

export default (app) => {
    app.get('/api/oauth/github', catchError(githubAuth))
    app.get('/api/oauth/github/callback', catchError(completeGithubAuth))
    app.get('/api/oauth/twitter', catchError(twitterAuth))
    app.get('/api/oauth/twitter/callback', catchError(completeTwitterAuth))
}

async function completeTwitterAuth(req, res) {
    const { state, code } = req.query
    const _state = await req.db.findOne('OAuthState', {
        where: { _id: state },
    })
    if (!_state) {
        res.status(401).json({
            error: 'Invalid state',
        })
        return
    }
    await req.db.delete('OAuthState', {
        where: {
            _id: state,
        },
    })
    const args = {
        code,
        grant_type: 'authorization_code',
        client_id: TWITTER_CLIENT_ID,
        code_verifier: _state.data,
        redirect_uri: TWITTER_REDIRECT_URI,
    }
    const body = Object.entries(args)
        .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
        .join('&')
    const auth = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        body,
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
        },
    }).then((r) => r.json())
    const user = await fetch('https://api.twitter.com/2/users/me', {
        headers: {
            authorization: `Bearer ${auth.access_token}`,
        },
    }).then((r) => r.json())
    res.json(user)
}

async function twitterAuth(req, res) {
    const challenge = crypto.randomBytes(32).toString('hex')
    const _state = await req.db.create('OAuthState', {
        type: 'twitter',
        data: challenge,
    })
    const url = new URL('https://twitter.com/i/oauth2/authorize')
    url.searchParams.append('response_type', 'code')
    url.searchParams.append('client_id', TWITTER_CLIENT_ID)
    url.searchParams.append('redirect_uri', TWITTER_REDIRECT_URI)
    url.searchParams.append('scope', 'users.read tweet.read')
    url.searchParams.append('state', _state._id)
    // this PKCE thing seems stupid
    url.searchParams.append('code_challenge', challenge)
    url.searchParams.append('code_challenge_method', 'plain')
    res.redirect(url.toString())
}

async function githubAuth(req, res) {
    const state = await req.db.create('OAuthState', {
        type: 'github',
    })
    const url = new URL('https://github.com/login/oauth/authorize')
    url.searchParams.append('client_id', GITHUB_CLIENT_ID)
    url.searchParams.append('redirect_uri', GITHUB_REDIRECT_URI)
    url.searchParams.append('state', state._id)
    url.searchParams.append('allow_signup', 'false')
    res.redirect(url.toString())
}

async function completeGithubAuth(req, res, next) {
    const { code, state } = req.query
    const _state = await req.db.findOne('OAuthState', {
        where: { _id: state },
    })
    if (!_state) {
        res.status(401).json({
            error: 'Invalid state',
        })
        return
    }
    await req.db.delete('OAuthState', {
        where: {
            _id: state,
        },
    })
    const url = new URL('https://github.com/login/oauth/access_token')
    url.searchParams.append('client_id', GITHUB_CLIENT_ID)
    url.searchParams.append('client_secret', GITHUB_CLIENT_SECRET)
    url.searchParams.append('code', code)
    const auth = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            accept: 'application/json',
        },
    })
    const { access_token, scope, token_type } = await auth.json()
    const user = await fetch('https://api.github.com/user', {
        headers: {
            authorization: `token ${access_token}`,
        },
    }).then((r) => r.json())
    const { id, followers } = user
    /*
    {"login":"vimwitch","id":631020,"node_id":"MDQ6VXNlcjYzMTAyMA==","avatar_url":"https://avatars.githubusercontent.com/u/631020?v=4","gravatar_id":"","url":"https://api.github.com/users/vimwitch","html_url":"https://github.com/vimwitch","followers_url":"https://api.github.com/users/vimwitch/followers","following_url":"https://api.github.com/users/vimwitch/following{/other_user}","gists_url":"https://api.github.com/users/vimwitch/gists{/gist_id}","starred_url":"https://api.github.com/users/vimwitch/starred{/owner}{/repo}","subscriptions_url":"https://api.github.com/users/vimwitch/subscriptions","organizations_url":"https://api.github.com/users/vimwitch/orgs","repos_url":"https://api.github.com/users/vimwitch/repos","events_url":"https://api.github.com/users/vimwitch/events{/privacy}","received_events_url":"https://api.github.com/users/vimwitch/received_events","type":"User","site_admin":false,"name":"Chance","company":"Ethereum Foundation","blog":"","location":"Austin","email":"jchancehud@gmail.com","hireable":null,"bio":"^void(){ return; }();","twitter_username":null,"public_repos":134,"public_gists":24,"followers":16,"following":2,"created_at":"2011-02-22T00:57:54Z","updated_at":"2022-08-02T23:33:09Z"}
    */
    res.json(user)
}
