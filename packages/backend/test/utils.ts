import fetch from 'node-fetch'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { ZkIdentity } from '@unirep/crypto'
import { genEpochKey, schema, UserState } from '@unirep/core'
import { getUnirepContract } from '@unirep/contracts'
import { DB, SQLiteConnector } from 'anondb/node'
import { ethers } from 'ethers'

export const genUserState = async (
    provider: ethers.providers.Provider,
    address: string,
    userIdentity: ZkIdentity,
    _db?: DB
) => {
    const unirepContract = getUnirepContract(address, provider)
    let db: DB = _db ?? (await SQLiteConnector.create(schema, ':memory:'))
    const userState = new UserState(
        db,
        defaultProver,
        unirepContract,
        userIdentity
    )
    await userState.start()
    await userState.waitForSync()
    return userState
}

export const getInvitationCode = async (t) => {
    const r = await fetch(`${t.context.url}/api/genInvitationCode?code=ffff`)
    t.is(r.status, 200)
    const signupCode = await r.json()
    return signupCode
}

export const waitForBackendBlock = async (t, blockNumber) => {
    for (;;) {
        const { blockNumber: latestBlock } = await fetch(
            `${t.context.url}/api/block`
        ).then((r) => r.json())
        if (latestBlock >= +blockNumber) break
        await new Promise((r) => setTimeout(r, 2000))
    }
}

export const signUp = async (t) => {
    const iden = new ZkIdentity()
    // const iden = genIdentity()
    const commitment = iden
        .genIdentityCommitment()
        .toString(16)
        .padStart(64, '0')
    const currentEpoch = await t.context.unirep.currentEpoch()

    const invitationCode = await getInvitationCode(t)
    const params = new URLSearchParams({
        commitment,
        invitationCode,
    })
    const r = await fetch(`${t.context.url}/api/signup?${params}`)
    const data = await r.json()
    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    t.assert(/^0x[0-9a-fA-F]{64}$/.test(data.transaction))
    t.is(currentEpoch.toString(), data.epoch.toString())
    t.is(r.status, 200)

    await waitForBackendBlock(t, receipt.blockNumber)
    // sign in should success
    await signIn(t, commitment)

    return { iden, commitment }
}

export const airdrop = async (t, iden) => {
    const userState = await genUserState(
        t.context.unirepSocial.provider,
        t.context.unirep.address,
        iden
    )
    const signUpProof = await userState.genUserSignUpProof(t.context.attesterId)
    const isValid = await signUpProof.verify()
    t.true(isValid)

    const r = await fetch(`${t.context.url}/api/airdrop`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            proof: signUpProof.proof,
            publicSignals: signUpProof.publicSignals,
        }),
    })
    const data = await r.json()
    if (!r.ok) {
        throw new Error(`/airdrop error ${JSON.stringify(data)}`)
    }
    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )
    await waitForBackendBlock(t, receipt.blockNumber)
    t.pass()
}

export const signIn = async (t, commitment) => {
    // now try signing in using this identity
    const params = new URLSearchParams({
        commitment,
    })
    const r = await fetch(`${t.context.url}/api/signin?${params}`)
    if (!r.ok) {
        throw new Error(`/signin error`)
    }
    t.is(r.status, 200)
}

export const getSpent = async (t, iden) => {
    const currentEpoch = Number(await t.context.unirep.currentEpoch())
    const epks: string[] = []
    for (let i = 0; i < t.context.constants.EPOCH_KEY_NONCE_PER_EPOCH; i++) {
        epks.push(
            genEpochKey(iden.identityNullifier, currentEpoch, i).toString(16)
        )
    }
    const paramStr = epks.join('_')
    const r = await fetch(
        `${t.context.url}/api/records/${paramStr}?spentonly=true`
    )
    const data = await r.json()
    if (!r.ok) {
        throw new Error(`/records error ${JSON.stringify(data)}`)
    }
    let spent = 0
    for (var i = 0; i < data.length; i++) {
        spent = spent + data[i].spent
    }
    return spent
}

const genReputationProof = async (t, iden, proveAmount) => {
    const userState = await genUserState(
        t.context.unirepSocial.provider,
        t.context.unirep.address,
        iden
    )
    // find valid nonce starter
    // gen proof
    const epkNonce = 0
    const repProof = await userState.genProveReputationProof(
        t.context.attesterId,
        epkNonce,
        proveAmount,
        BigInt(0),
        BigInt(0),
        proveAmount
    )
    const isValid = await repProof.verify()
    t.true(isValid)
    // we need to wait for the backend to process whatever block our provider is on
    const blockNumber = await t.context.provider.getBlockNumber()
    return {
        proof: repProof.proof,
        publicSignals: repProof.publicSignals,
        blockNumber,
    }
}

export const createPost = async (t, iden) => {
    const proveAmount = t.context.constants.DEFAULT_POST_KARMA
    const { blockNumber, proof, publicSignals } = await genReputationProof(
        t,
        iden,
        proveAmount
    )
    await waitForBackendBlock(t, blockNumber)

    const r = await fetch(`${t.context.url}/api/post`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            title: 'test',
            content: 'some content!',
            publicSignals,
            proof,
        }),
    })

    const data = await r.json()
    const prevSpent = await getSpent(t, iden)
    if (!r.ok) {
        throw new Error(`/post error ${JSON.stringify(data)}`)
    }
    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    for (;;) {
        await new Promise((r) => setTimeout(r, 1000))
        const currentSpent = await getSpent(t, iden)
        if (prevSpent + proveAmount !== currentSpent) continue
        t.is(prevSpent + proveAmount, currentSpent)

        const { blockNumber: latestBlock } = await fetch(
            `${t.context.url}/api/block`
        ).then((r) => r.json())
        if (latestBlock < receipt.blockNumber) continue
        else break
    }
    return data
}

export const queryPost = async (t, postId) => {
    for (;;) {
        await new Promise((r) => setTimeout(r, 1000))
        const r = await fetch(`${t.context.url}/api/post/${postId}`)
        if (r.status === 404) continue
        t.is(r.status, 200)
        return true
    }
}

export const createComment = async (t, iden, postId) => {
    const proveAmount = t.context.constants.DEFAULT_COMMENT_KARMA
    const { blockNumber, proof, publicSignals } = await genReputationProof(
        t,
        iden,
        proveAmount
    )
    await waitForBackendBlock(t, blockNumber)

    const r = await fetch(`${t.context.url}/api/comment`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            postId,
            content: 'this is a comment!',
            publicSignals,
            proof,
        }),
    })
    const data = await r.json()
    const prevSpent = await getSpent(t, iden)
    if (!r.ok) {
        throw new Error(`/comment error ${JSON.stringify(data)}`)
    }
    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    for (;;) {
        await new Promise((r) => setTimeout(r, 1000))
        const currentSpent = await getSpent(t, iden)
        if (prevSpent + proveAmount !== currentSpent) continue
        t.is(prevSpent + proveAmount, currentSpent)

        const { blockNumber: latestBlock } = await fetch(
            `${t.context.url}/api/block`
        ).then((r) => r.json())
        if (latestBlock < receipt.blockNumber) continue
        else break
    }
    return data
}

export const vote = async (
    t,
    iden,
    receiver,
    dataId,
    isPost,
    upvote,
    downvote
) => {
    const proveAmount = upvote + downvote
    const { blockNumber, proof, publicSignals } = await genReputationProof(
        t,
        iden,
        proveAmount
    )
    await waitForBackendBlock(t, blockNumber)

    const r = await fetch(`${t.context.url}/api/vote`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            dataId,
            isPost,
            publicSignals,
            proof,
            upvote,
            downvote,
            receiver,
        }),
    })
    const data = await r.json()
    const prevSpent = await getSpent(t, iden)
    if (!r.ok) {
        throw new Error(`/vote error ${JSON.stringify(data)}`)
    }
    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    for (;;) {
        await new Promise((r) => setTimeout(r, 1000))
        const currentSpent = await getSpent(t, iden)
        if (prevSpent + proveAmount !== currentSpent) continue
        t.is(prevSpent + proveAmount, currentSpent)

        const { blockNumber: latestBlock } = await fetch(
            `${t.context.url}/api/block`
        ).then((r) => r.json())
        if (latestBlock < receipt.blockNumber) continue
        else break
    }
    t.pass()
}

export const epochTransition = async (t) => {
    const r = await fetch(`${t.context.url}/api/epochTransition`, {
        method: 'POST',
        headers: {
            authorization: 'NLmKDUnJUpc6VzuPc7Wm',
        },
    })
    t.is(r.status, 204)
}

export const userStateTransition = async (t, iden) => {
    const userState = await genUserState(
        t.context.unirepSocial.provider,
        t.context.unirep.address,
        iden
    )

    const results = await userState.genUserStateTransitionProofs()
    const fromEpoch = userState.latestTransitionedEpoch

    const r = await fetch(`${t.context.url}/api/userStateTransition`, {
        method: 'POST',
        body: JSON.stringify({
            results,
            fromEpoch,
        }),
        headers: {
            'content-type': 'application/json',
        },
    })
    const data = await r.json()
    if (!r.ok) {
        throw new Error(`/userStateTransition error ${JSON.stringify(data)}`)
    }
    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    await waitForBackendBlock(t, receipt.blockNumber)
    t.pass()
}
