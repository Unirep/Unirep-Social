import fetch from 'node-fetch'
// import { defaultProver } from '@unirep-social/circuits/provers/defaultProver'
import { defaultProver } from './prover'
import { ZkIdentity } from '@unirep/crypto'
import { genEpochKey, schema } from '@unirep/core'
import { getUnirepContract } from '@unirep/contracts'
import { DB, SQLiteConnector } from 'anondb/node'
import { ethers } from 'ethers'
import { SocialUserState } from '@unirep-social/core'

export const genUserState = async (
    provider: ethers.providers.Provider,
    address: string,
    userIdentity: ZkIdentity,
    _db?: DB
) => {
    const unirepContract = getUnirepContract(address, provider)
    let db: DB = _db ?? (await SQLiteConnector.create(schema, ':memory:'))
    const userState = new SocialUserState(
        db,
        defaultProver,
        unirepContract,
        userIdentity
    )
    await userState.start()
    await userState.waitForSync()
    return userState
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

    const params = new URLSearchParams({
        commitment,
        signupCode: 'test',
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

export const airdrop = async (t, iden, negRep) => {
    const userState = await genUserState(
        t.context.unirepSocial.provider,
        t.context.unirep.address,
        iden
    )
    const negRepProof = await userState.genNegativeRepProof(
        t.context.attesterId,
        negRep
    )
    const isValid = await negRepProof.verify()
    t.true(isValid)
    await userState.stop()

    const r = await fetch(`${t.context.url}/api/airdrop`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            proof: negRepProof.proof,
            publicSignals: negRepProof.publicSignals,
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
            genEpochKey(iden.identityNullifier, currentEpoch, i).toString()
        )
    }
    const paramStr = epks.join('_')
    const r = await fetch(`${t.context.url}/api/records/${paramStr}`)
    const data = await r.json()
    if (!r.ok) {
        throw new Error(`/records error ${JSON.stringify(data)}`)
    }
    let spent = 0
    for (var i = 0; i < data.length; i++) {
        if (epks.indexOf(data[i].from) !== -1 && !data[i].spentFromSubsidy) {
            spent = spent + data[i].upvote + data[i].downvote
        }
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
    await userState.stop()
    // we need to wait for the backend to process whatever block our provider is on
    const blockNumber = await t.context.provider.getBlockNumber()
    return {
        proof: repProof.proof,
        publicSignals: repProof.publicSignals,
        blockNumber,
    }
}

export const createPost = async (t, iden) => {
    const prevSpent = await getSpent(t, iden)

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
    if (!r.ok) {
        throw new Error(`/post error ${JSON.stringify(r)}`)
    }

    const data = await r.json()
    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    for (;;) {
        await new Promise((r) => setTimeout(r, 1000))
        const currentSpent = await getSpent(t, iden)
        console.log('current spent: ', currentSpent)
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

export const createPostSubsidy = async (t, iden) => {
    console.log('call create post subsidy')
    const userState = await genUserState(
        t.context.unirepSocial.provider,
        t.context.unirep.address,
        iden
    )
    const subsidyProof = await userState.genSubsidyProof(t.context.attesterId)
    const isValid = await subsidyProof.verify()
    t.true(isValid)
    await userState.stop()

    const r = await fetch(`${t.context.url}/api/post/subsidy`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            title: 'test',
            content: 'some content!',
            publicSignals: subsidyProof.publicSignals,
            proof: subsidyProof.proof,
        }),
    })

    const data = await r.json()
    if (!r.ok) {
        throw new Error(`/post error ${JSON.stringify(data)}`)
    }
    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    await waitForBackendBlock(t, receipt.blockNumber)
    return data
}

export const editPost = async (t, iden, title, content) => {
    const { post } = await createPost(t, iden)
    const userState = await genUserState(
        t.context.unirepSocial.provider,
        t.context.unirep.address,
        iden
    )
    // find valid nonce starter
    // gen proof
    const epkNonce = 0
    const { publicSignals, proof } = await userState.genVerifyEpochKeyProof(
        epkNonce
    )
    await userState.stop()

    // we need to wait for the backend to process whatever block our provider is on
    const blockNumber = await t.context.provider.getBlockNumber()
    await waitForBackendBlock(t, blockNumber)

    const r = await fetch(`${t.context.url}/api/post/edit/${post._id}`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            title,
            content,
            publicSignals,
            proof,
        }),
    })

    const data = await r.json()
    if (!r.ok) {
        throw new Error(`/post error ${JSON.stringify(data)}`)
    }
    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    for (;;) {
        await new Promise((r) => setTimeout(r, 1000))
        const { blockNumber: latestBlock } = await fetch(
            `${t.context.url}/api/block`
        ).then((r) => r.json())
        if (latestBlock < receipt.blockNumber) continue
        else break
    }
    return data
}

export const deletePost = async (t, iden) => {
    const { post } = await createPost(t, iden)
    const userState = await genUserState(
        t.context.unirepSocial.provider,
        t.context.unirep.address,
        iden
    )
    // find valid nonce starter
    // gen proof
    const epkNonce = 0
    const { publicSignals, proof } = await userState.genVerifyEpochKeyProof(
        epkNonce
    )
    await userState.stop()

    // we need to wait for the backend to process whatever block our provider is on
    const blockNumber = await t.context.provider.getBlockNumber()
    await waitForBackendBlock(t, blockNumber)

    const r = await fetch(`${t.context.url}/api/post/delete/${post._id}`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            publicSignals,
            proof,
        }),
    })

    const data = await r.json()
    if (!r.ok) {
        throw new Error(`/post error ${JSON.stringify(data)}`)
    }
    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    for (;;) {
        await new Promise((r) => setTimeout(r, 1000))
        const { blockNumber: latestBlock } = await fetch(
            `${t.context.url}/api/block`
        ).then((r) => r.json())
        if (latestBlock < receipt.blockNumber) continue
        else break
    }
    return data
}

export const editComment = async (t, iden, postId, content) => {
    const { comment } = await createComment(t, iden, postId)
    const userState = await genUserState(
        t.context.unirepSocial.provider,
        t.context.unirep.address,
        iden
    )
    // find valid nonce starter
    // gen proof
    const epkNonce = 0
    const { publicSignals, proof } = await userState.genVerifyEpochKeyProof(
        epkNonce
    )
    await userState.stop()

    // we need to wait for the backend to process whatever block our provider is on
    const blockNumber = await t.context.provider.getBlockNumber()
    await waitForBackendBlock(t, blockNumber)

    const r = await fetch(`${t.context.url}/api/comment/edit/${comment._id}`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            content,
            publicSignals,
            proof,
        }),
    })

    const data = await r.json()
    if (!r.ok) {
        throw new Error(`/comment error ${JSON.stringify(data)}`)
    }
    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    for (;;) {
        await new Promise((r) => setTimeout(r, 1000))
        const { blockNumber: latestBlock } = await fetch(
            `${t.context.url}/api/block`
        ).then((r) => r.json())
        if (latestBlock < receipt.blockNumber) continue
        else break
    }
    return data
}

export const deleteComment = async (t, iden, postId) => {
    const { comment } = await createComment(t, iden, postId)
    const userState = await genUserState(
        t.context.unirepSocial.provider,
        t.context.unirep.address,
        iden
    )
    // find valid nonce starter
    // gen proof
    const epkNonce = 0
    const { publicSignals, proof } = await userState.genVerifyEpochKeyProof(
        epkNonce
    )
    await userState.stop()

    // we need to wait for the backend to process whatever block our provider is on
    const blockNumber = await t.context.provider.getBlockNumber()
    await waitForBackendBlock(t, blockNumber)

    const r = await fetch(
        `${t.context.url}/api/comment/delete/${comment._id}`,
        {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                publicSignals,
                proof,
            }),
        }
    )

    const data = await r.json()
    if (!r.ok) {
        throw new Error(`/comment error ${JSON.stringify(data)}`)
    }
    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    for (;;) {
        await new Promise((r) => setTimeout(r, 1000))
        const { blockNumber: latestBlock } = await fetch(
            `${t.context.url}/api/block`
        ).then((r) => r.json())
        if (latestBlock < receipt.blockNumber) continue
        else break
    }
    return data
}

export const queryPost = async (t, id) => {
    for (var i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 1000))
        const r = await fetch(`${t.context.url}/api/post/${id}`)
        if (r.status === 404) continue
        t.is(r.status, 200)
        const data = await r.json()
        return data
    }
    return 'no such post'
}

export const queryComment = async (t, id) => {
    for (var i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 1000))
        const r = await fetch(`${t.context.url}/api/comment/${id}`)
        if (r.status === 404) continue
        t.is(r.status, 200)
        const data = await r.json()
        return data
    }
    return 'no such comment'
}

export const createComment = async (t, iden, postId) => {
    const prevSpent = await getSpent(t, iden)

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
    if (!r.ok) {
        throw new Error(`/comment error ${JSON.stringify(r)}`)
    }

    const data = await r.json()
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
    const prevSpent = await getSpent(t, iden)

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
    if (!r.ok) {
        throw new Error(`/vote error ${JSON.stringify(r)}`)
    }
    const data = await r.json()

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
    const prevEpoch = await t.context.unirep.currentEpoch()
    const calldata = (t.context.unirep as any).interface.encodeFunctionData(
        'beginEpochTransition',
        []
    )
    // wait for epoch transition
    for (;;) {
        try {
            const hash = await t.context.txManager.queueTransaction(
                t.context.unirep.address,
                {
                    data: calldata,
                }
            )
            await t.context.txManager.wait(hash)
        } catch (_) {}
        const currentEpoch = await t.context.unirep.currentEpoch()
        if (+currentEpoch === +prevEpoch + 1) break
        await new Promise((r) => setTimeout(r, 1000))
    }
}

export const userStateTransition = async (t, iden) => {
    const userState = await genUserState(
        t.context.unirepSocial.provider,
        t.context.unirep.address,
        iden
    )

    const results = await userState.genUserStateTransitionProofs()
    const fromEpoch = userState.latestTransitionedEpoch
    await userState.stop()

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

export const genUsernameProof = async (t, iden, preImage) => {
    const userState = await genUserState(
        t.context.unirepSocial.provider,
        t.context.unirep.address,
        iden
    )

    const epkNonce = 0

    const usernameProof = await userState.genProveReputationProof(
        t.context.attesterId,
        epkNonce,
        0,
        preImage == 0 ? BigInt(0) : BigInt(1),
        preImage,
        0
    )

    const isValid = await usernameProof.verify()
    t.true(isValid)
    await userState.stop()

    // we need to wait for the backend to process whatever block our provider is on
    const blockNumber = await t.context.provider.getBlockNumber()

    return {
        proof: usernameProof.proof,
        publicSignals: usernameProof.publicSignals,
        blockNumber,
    }
}

export const setUsername = async (t, iden, preImage, newUsername) => {
    const hexlifiedPreImage =
        preImage == 0
            ? 0
            : ethers.utils.hexlify(ethers.utils.toUtf8Bytes(preImage))
    const { proof, publicSignals, blockNumber } = await genUsernameProof(
        t,
        iden,
        hexlifiedPreImage
    )
    await waitForBackendBlock(t, blockNumber)

    const r = await fetch(`${t.context.url}/api/usernames`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            newUsername,
            publicSignals,
            proof,
        }),
    })

    const data = await r.json()

    if (!r.ok) {
        throw new Error(`/post error ${JSON.stringify(data)}`)
    }
    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    await waitForBackendBlock(t, receipt.blockNumber)
}
