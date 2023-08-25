import catchError from '../catchError'
import {
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    TWITTER_CLIENT_ID,
    TWITTER_REDIRECT_URI,
    GITHUB_REDIRECT_URI,
} from '../constants'
import fetch from 'node-fetch'
import crypto from 'crypto'

export default (app) => {
    app.get('/api/oauth/github', catchError(githubAuth))
    app.get('/api/oauth/github/callback', catchError(completeGithubAuth))
    app.get('/api/oauth/twitter', catchError(twitterAuth))
    app.get('/api/oauth/twitter/callback', catchError(completeTwitterAuth))
}

async function completeTwitterAuth(req, res) {
    const { state, code, error } = req.query
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
    if (error) {
        // access was denied
        const url = new URL(_state.redirectDestination)
        url.searchParams.append(
            'signupError',
            'There was a problem authenticating you'
        )
        res.redirect(url.toString())
        return
    }
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
    const auth = (await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        body,
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
        },
    }).then((r) => r.json())) as any
    const user = (await fetch('https://api.twitter.com/2/users/me', {
        headers: {
            authorization: `Bearer ${auth.access_token}`,
        },
    }).then((r) => r.json())) as any
    if (!user.data.id) {
        const url = new URL(_state.redirectDestination)
        url.searchParams.append('signupError', 'Unknown problem')
        res.redirect(url.toString())
        return
    }
    // end oauth logic
    // generate a signup code and give it to the user
    // prevent double signup
    const signupId = `twitter-${user.data.id}`
    const existingSignup = await req.db.findOne('SignupCode', {
        where: {
            signupId,
        },
    })
    const url = new URL(_state.redirectDestination)
    if (existingSignup || existingSignup?.usedAt) {
        url.searchParams.append(
            'signupError',
            'You have already signed up with this account'
        )
        res.redirect(url.toString())
        return
    }
    const signupCode = await req.db.create('SignupCode', {
        signupId,
    })
    // now go back to the frontend signup flow
    url.searchParams.append('signupCode', signupCode._id)
    res.redirect(url.toString())
}

async function twitterAuth(req, res) {
    const challenge = crypto.randomBytes(32).toString('hex')
    const _state = await req.db.create('OAuthState', {
        type: 'twitter',
        data: challenge,
        redirectDestination: req.query.redirectDestination,
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
        redirectDestination: req.query.redirectDestination,
    })
    const url = new URL('https://github.com/login/oauth/authorize')
    url.searchParams.append('client_id', GITHUB_CLIENT_ID)
    url.searchParams.append('redirect_uri', GITHUB_REDIRECT_URI)
    url.searchParams.append('state', state._id)
    url.searchParams.append('allow_signup', 'false')
    res.redirect(url.toString())
}

async function completeGithubAuth(req, res, next) {
    const { code, state, error } = req.query
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
    if (error) {
        // access was denied
        const url = new URL(_state.redirectDestination)
        url.searchParams.append(
            'signupError',
            'There was a problem authenticating you'
        )
        res.redirect(url.toString())
        return
    }
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
    const { access_token, scope, token_type } = (await auth.json()) as any
    const user = (await fetch('https://api.github.com/user', {
        headers: {
            authorization: `token ${access_token}`,
        },
    }).then((r) => r.json())) as any
    if (!user.id) {
        const _url = new URL(_state.redirectDestination)
        _url.searchParams.append('signupError', 'Unknown problem')
        res.redirect(_url.toString())
        return
    }
    // end oauth logic
    const signupId = `github-${user.id}`
    const existingSignup = await req.db.findOne('SignupCode', {
        where: {
            signupId,
        },
    })
    const _url = new URL(_state.redirectDestination)
    if (existingSignup || existingSignup?.usedAt) {
        _url.searchParams.append(
            'signupError',
            'You have already signed up with this account'
        )
        res.redirect(_url.toString())
        return
    }
    const signupCode = await req.db.create('SignupCode', {
        signupId,
    })
    // now go back to the frontend signup flow
    _url.searchParams.append('signupCode', signupCode._id)
    res.redirect(_url.toString())
}
