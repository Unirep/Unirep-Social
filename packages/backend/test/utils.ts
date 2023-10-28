import fetch from 'node-fetch'
import { expect } from 'chai'
import { defaultProver } from './prover'
import { Identity } from '@semaphore-protocol/identity'
import { DB } from 'anondb/node'
import { ethers } from 'ethers'
import { SocialUserState } from '@unirep-social/core'
import { UnirepSocialSynchronizer } from '../src/Synchronizer'
import { stringifyBigInts } from '@unirep/utils'
export const genUnirepState = async (
    provider: ethers.providers.Provider,
    unirepAddress: string,
    unirepSocialAddress: string,
    db?: DB
) => {
    const unirep = new UnirepSocialSynchronizer({
        unirepAddress,
        provider,
        unirepSocialAddress,
        db: db,
    })
    unirep.pollRate = 150
    await unirep.start()
    await unirep.waitForSync()
    return unirep
}

export const genUserState = async (
    provider: ethers.providers.Provider,
    address: string,
    id: Identity,
    unirepSocialAddress: string,
    db?: DB
) => {
    const state = new SocialUserState({
        unirepAddress: address,
        provider,
        db,
        id,
        prover: defaultProver,
        unirepSocialAddress,
    })
    await state.start()
    await state.waitForSync()
    return state
}

export const waitForBackendBlock = async (t, blockNumber) => {
    for (;;) {
        const { blockNumber: latestBlock } = (await fetch(
            `${t.context.url}/api/block`
        ).then((r) => r.json())) as any
        if (latestBlock >= +blockNumber) break
        await new Promise((r) => setTimeout(r, 2000))
    }
}

export const signUp = async (t) => {
    const iden = new Identity()
    const userState = await genUserState(
        t.context.provider,
        t.context.unirep.address,
        iden,
        t.context.unirepSocial.address
    )
    const epoch = await t.context.unirep.attesterCurrentEpoch(
        t.context.unirepSocial.address
    )
    const { publicSignals, proof } = await userState.genUserSignUpProof({
        epoch,
    })
    userState.stop()

    const r = await fetch(`${t.context.url}/api/signup`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            proof: proof.map((n) => n.toString()),
            publicSignals: publicSignals.map((n) => n.toString()),
        }),
    })
    if (r.status !== 200)
        throw new Error(`/signup error ${JSON.stringify(await r.json())}`)
    else if (!r.ok) throw new Error(`/signup error ${JSON.stringify(r)}`)
    const data = await r.json()
    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    const regex = new RegExp('^0x[0-9a-fA-F]{64}$')
    expect(regex.test(data.transaction)).to.be.true

    await waitForBackendBlock(t, receipt.blockNumber)

    return { iden }
}

export const airdrop = async (t, iden) => {
    const userState = await genUserState(
        t.context.provider,
        t.context.unirep.address,
        iden,
        t.context.unirepSocial.address
    )
    const epoch = await userState?.sync.loadCurrentEpoch()
    const userData = await userState.getData(epoch - 1)
    const airdropRep = (await t.context.unirepSocial.subsidy()).toNumber()
    const negRep = Number(userData[1])
    const revealNonce = true
    const epkNonce = 0
    const actionProof = await userState.genActionProof({
        epkNonce,
        revealNonce,
        maxRep: negRep > airdropRep ? airdropRep : negRep,
    })
    const isValid = await actionProof.verify()
    expect(isValid).to.be.true
    userState.stop()

    const r = await fetch(`${t.context.url}/api/airdrop`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            proof: actionProof.proof.map((n) => n.toString()),
            publicSignals: actionProof.publicSignals.map((n) => n.toString()),
        }),
    })
    if (r.status !== 200)
        throw new Error(`/airdrop error ${JSON.stringify(await r.json())}`)
    else if (!r.ok) throw new Error(`/airdrop error ${JSON.stringify(r)}`)
    const data = await r.json()

    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )
    await waitForBackendBlock(t, receipt.blockNumber)
}

export const createPost = async (t, iden) => {
    const proveAmount = t.context.constants.DEFAULT_POST_REP
    const userState = await genUserState(
        t.context.unirepSocial.provider,
        t.context.unirep.address,
        iden,
        t.context.unirepSocial.address
    )
    const { publicSignals, proof } = await userState.genActionProof({
        spentRep: proveAmount,
    })
    userState.stop()
    const r = await fetch(`${t.context.url}/api/post`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            title: 'test',
            content: 'some content!',
            publicSignals: publicSignals.map((n) => n.toString()),
            proof: proof.map((n) => n.toString()),
        }),
    })
    if (r.status !== 200)
        throw new Error(`/post error ${JSON.stringify(await r.json())}`)
    else if (!r.ok) throw new Error(`/post error ${JSON.stringify(r)}`)

    const data = await r.json()
    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )
    await waitForBackendBlock(t, receipt.blockNumber)

    return data
}

export const createPostSubsidy = async (t, iden) => {
    const userState = await genUserState(
        t.context.unirepSocial.provider,
        t.context.unirep.address,
        iden,
        t.context.unirepSocial.address
    )
    const epkNonce = 0
    const revealNonce = true
    const subsidyProof = await userState.genActionProof({
        epkNonce,
        revealNonce,
    })
    const isValid = await subsidyProof.verify()
    expect(isValid).to.be.true
    userState.stop()

    const r = await fetch(`${t.context.url}/api/post/subsidy`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            title: 'test',
            content: 'some content!',
            publicSignals: subsidyProof.publicSignals.map((n) => n.toString()),
            proof: subsidyProof.proof.map((n) => n.toString()),
        }),
    })

    if (r.status !== 200)
        throw new Error(`/post error ${JSON.stringify(await r.json())}`)
    else if (!r.ok) throw new Error(`/post error ${JSON.stringify(r)}`)
    const data = await r.json()

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
        iden,
        t.context.unirepSocial.address
    )
    // find valid nonce starter
    // gen proof
    const nonce = 0
    const { publicSignals, proof } = await userState.genEpochKeyLiteProof({
        nonce,
    })
    userState.stop()

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
            publicSignals: publicSignals.map((n) => n.toString()),
            proof: proof.map((n) => n.toString()),
        }),
    })
    if (r.status !== 200)
        throw new Error(`/post error ${JSON.stringify(await r.json())}`)
    else if (!r.ok) throw new Error(`/post error ${JSON.stringify(r)}`)

    const data = await r.json()
    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    await waitForBackendBlock(t, receipt.blockNumber)
    return data
}

export const deletePost = async (t, iden) => {
    const { post } = await createPost(t, iden)
    const userState = await genUserState(
        t.context.unirepSocial.provider,
        t.context.unirep.address,
        iden,
        t.context.unirepSocial.address
    )
    // find valid nonce starter
    // gen proof
    const nonce = 0
    const { publicSignals, proof } = await userState.genEpochKeyLiteProof({
        nonce,
    })
    userState.stop()

    // we need to wait for the backend to process whatever block our provider is on
    const blockNumber = await t.context.provider.getBlockNumber()
    await waitForBackendBlock(t, blockNumber)

    const r = await fetch(`${t.context.url}/api/post/delete/${post._id}`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            publicSignals: publicSignals.map((n) => n.toString()),
            proof: proof.map((n) => n.toString()),
        }),
    })
    if (r.status !== 200)
        throw new Error(`/post error ${JSON.stringify(await r.json())}`)
    else if (!r.ok) throw new Error(`/post error ${JSON.stringify(r)}`)

    const data = await r.json()
    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    await waitForBackendBlock(t, receipt.blockNumber)
    return data
}

export const editComment = async (t, iden, postId, content) => {
    const { comment } = await createComment(t, iden, postId)
    const userState = await genUserState(
        t.context.unirepSocial.provider,
        t.context.unirep.address,
        iden,
        t.context.unirepSocial.address
    )
    // find valid nonce starter
    // gen proof
    const nonce = 0
    const { publicSignals, proof } = await userState.genEpochKeyLiteProof({
        nonce,
    })
    userState.stop()

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
            publicSignals: publicSignals.map((n) => n.toString()),
            proof: proof.map((n) => n.toString()),
        }),
    })

    if (r.status !== 200)
        throw new Error(`/comment error ${JSON.stringify(await r.json())}`)
    else if (!r.ok) throw new Error(`/comment error ${JSON.stringify(r)}`)
    const data = await r.json()

    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    await waitForBackendBlock(t, receipt.blockNumber)
    return data
}

export const deleteComment = async (t, iden, postId) => {
    const { comment } = await createComment(t, iden, postId)
    const userState = await genUserState(
        t.context.unirepSocial.provider,
        t.context.unirep.address,
        iden,
        t.context.unirepSocial.address
    )
    // find valid nonce starter
    // gen proof
    const nonce = 0
    const { publicSignals, proof } = await userState.genEpochKeyLiteProof({
        nonce,
    })
    userState.stop()

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
                publicSignals: publicSignals.map((n) => n.toString()),
                proof: proof.map((n) => n.toString()),
            }),
        }
    )

    if (r.status !== 200)
        throw new Error(`/comment error ${JSON.stringify(await r.json())}`)
    else if (!r.ok) throw new Error(`/comment error ${JSON.stringify(r)}`)
    const data = await r.json()

    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    await waitForBackendBlock(t, receipt.blockNumber)
    return data
}

export const queryPost = async (t, id) => {
    for (var i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 1000))
        const r = await fetch(`${t.context.url}/api/post/${id}`)
        if (r.status === 404) continue
        expect(r.status).to.equal(200)
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
        expect(r.status).to.equal(200)
        const data = await r.json()
        return data
    }
    return 'no such comment'
}

export const createComment = async (t, iden, postId) => {
    const proveAmount = t.context.constants.DEFAULT_COMMENT_REP
    const userState = await genUserState(
        t.context.unirepSocial.provider,
        t.context.unirep.address,
        iden,
        t.context.unirepSocial.address
    )
    const { publicSignals, proof } = await userState.genActionProof({
        spentRep: proveAmount,
    })
    userState.stop()

    const r = await fetch(`${t.context.url}/api/comment`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            postId,
            content: 'this is a comment!',
            publicSignals: publicSignals.map((n) => n.toString()),
            proof: proof.map((n) => n.toString()),
        }),
    })
    if (r.status !== 200)
        throw new Error(`/comment error ${JSON.stringify(await r.json())}`)
    else if (!r.ok) throw new Error(`/comment error ${JSON.stringify(r)}`)

    const data = await r.json()
    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    await waitForBackendBlock(t, receipt.blockNumber)
    return data
}

export const createCommentSubsidy = async (t, iden, postId) => {
    const userState = await genUserState(
        t.context.unirepSocial.provider,
        t.context.unirep.address,
        iden,
        t.context.unirepSocial.address
    )
    const epkNonce = 0
    const revealNonce = true
    const subsidyProof = await userState.genActionProof({
        epkNonce,
        revealNonce,
    })
    const isValid = await subsidyProof.verify()
    expect(isValid).to.be.true
    userState.stop()

    const r = await fetch(`${t.context.url}/api/comment/subsidy`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            postId,
            content: 'some content!',
            publicSignals: subsidyProof.publicSignals.map((n) => n.toString()),
            proof: subsidyProof.proof.map((n) => n.toString()),
        }),
    })

    if (r.status !== 200)
        throw new Error(`/comment error ${JSON.stringify(await r.json())}`)
    else if (!r.ok) throw new Error(`/comment error ${JSON.stringify(r)}`)
    const data = await r.json()
    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    await waitForBackendBlock(t, receipt.blockNumber)
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
    const userState = await genUserState(
        t.context.unirepSocial.provider,
        t.context.unirep.address,
        iden,
        t.context.unirepSocial.address
    )
    const { publicSignals, proof } = await userState.genActionProof({
        spentRep: proveAmount,
    })
    userState.stop()

    const r = await fetch(`${t.context.url}/api/vote`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            dataId,
            isPost,
            publicSignals: publicSignals.map((n) => n.toString()),
            proof: proof.map((n) => n.toString()),
            upvote,
            downvote,
            receiver,
        }),
    })
    if (r.status !== 200)
        throw new Error(`/vote error ${JSON.stringify(await r.json())}`)
    else if (!r.ok) throw new Error(`/vote error ${JSON.stringify(r)}`)
    const data = await r.json()

    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    await waitForBackendBlock(t, receipt.blockNumber)
}

export const voteSubsidy = async (
    t,
    iden,
    receiver,
    dataId,
    isPost,
    upvote,
    downvote
) => {
    const userState = await genUserState(
        t.context.unirepSocial.provider,
        t.context.unirep.address,
        iden,
        t.context.unirepSocial.address
    )
    const epkNonce = 0
    const revealNonce = true
    const subsidyProof = await userState.genActionProof({
        epkNonce,
        revealNonce,
        notEpochKey: receiver,
    })
    const isValid = await subsidyProof.verify()
    expect(isValid).to.be.true
    userState.stop()

    const { publicSignals, proof } = subsidyProof
    const r = await fetch(`${t.context.url}/api/vote/subsidy`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            dataId,
            isPost,
            publicSignals: publicSignals.map((n) => n.toString()),
            proof: proof.map((n) => n.toString()),
            upvote,
            downvote,
            receiver,
        }),
    })

    if (r.status !== 200)
        throw new Error(`/vote error ${JSON.stringify(await r.json())}`)
    else if (!r.ok) throw new Error(`/vote error ${JSON.stringify(r)}`)
    const data = await r.json()
    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    await waitForBackendBlock(t, receipt.blockNumber)
    return data
}

export const userStateTransition = async (t, iden) => {
    const userState: SocialUserState = await genUserState(
        t.context.unirepSocial.provider,
        t.context.unirep.address,
        iden,
        t.context.unirepSocial.address
    )

    const latestEpoch = await t.context.unirep.attesterCurrentEpoch(
        t.context.unirepSocial.address
    )
    const remainingTime = await t.context.unirep.attesterEpochRemainingTime(
        t.context.unirepSocial.address
    )
    // epoch transition
    await t.context.unirepSocial.provider.send('evm_increaseTime', [
        remainingTime,
    ])
    await t.context.unirepSocial.provider.send('evm_mine', [])

    const toEpoch = latestEpoch + 1
    const results = await userState.genUserStateTransitionProof({ toEpoch })
    userState.stop()

    const r = await fetch(`${t.context.url}/api/userStateTransition`, {
        method: 'POST',
        body: JSON.stringify({
            results: stringifyBigInts(results),
        }),
        headers: {
            'content-type': 'application/json',
        },
    })
    if (r.status !== 200)
        throw new Error(
            `/userStateTransition error ${JSON.stringify(await r.json())}`
        )
    else if (!r.ok)
        throw new Error(`/userStateTransition error ${JSON.stringify(r)}`)
    const data = await r.json()

    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    await waitForBackendBlock(t, receipt.blockNumber)
}

export const genUsernameProof = async (t, iden, username) => {
    const userState: SocialUserState = await genUserState(
        t.context.unirepSocial.provider,
        t.context.unirep.address,
        iden,
        t.context.unirepSocial.address
    )

    const epkNonce = 0
    const graffiti = username !== 0 ? BigInt(username) : undefined

    const usernameProof = await userState.genActionProof({
        epkNonce,
        graffiti,
    })

    const isValid = await usernameProof.verify()
    if (!isValid) {
        throw new Error('usernameProof is not valid')
    }
    userState.stop()

    // we need to wait for the backend to process whatever block our provider is on
    const blockNumber = await t.context.provider.getBlockNumber()

    return {
        proof: usernameProof.proof.map((n) => n.toString()),
        publicSignals: usernameProof.publicSignals.map((n) => n.toString()),
        blockNumber,
    }
}

export const setUsername = async (t, iden, username, newUsername) => {
    const hexlifiedUsername =
        username === 0
            ? 0
            : ethers.utils.hexlify(ethers.utils.toUtf8Bytes(username))
    const { proof, publicSignals, blockNumber } = await genUsernameProof(
        t,
        iden,
        hexlifiedUsername
    )
    await waitForBackendBlock(t, blockNumber)

    const r = await fetch(`${t.context.url}/api/usernames`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            newUsername,
            publicSignals: publicSignals.map((n) => n.toString()),
            proof: proof.map((n) => n.toString()),
        }),
    })

    if (r.status !== 200)
        throw new Error(`/username error ${JSON.stringify(await r.json())}`)
    else if (!r.ok) throw new Error(`/username error ${JSON.stringify(r)}`)
    const data = await r.json()

    const receipt = await t.context.provider.waitForTransaction(
        data.transaction
    )

    await waitForBackendBlock(t, receipt.blockNumber)
}
