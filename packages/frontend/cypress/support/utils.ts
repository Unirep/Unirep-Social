import fetch from 'node-fetch'
import { ZkIdentity } from '@unirep/crypto'
import { genEpochKey, schema, UserState } from '@unirep/core'
import { getUnirepContract } from '@unirep/contracts'
import { ethers } from 'ethers'

export const getInvitationCode = async (t) => {
    const r = await fetch(`${t.context.url}/api/genInvitationCode?code=ffff`)
    t.is(r.status, 200)
    const signupCode = await r.json()
    return signupCode
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

export const signIn = async (t, commitment) => {
    console.log('testing committment', commitment)
    // now try signing in using this identity
    console.log('testing context url', t)
    const params = new URLSearchParams({
        commitment,
    })
    console.log('why are you  failing to fetch Mr. Url', `${t}/api/signin?${params}`)
    const r = await fetch(`${t}/api/signin?${params}`)
    if (!r.ok) {
        throw new Error(`/signin error`)
    }
    t.is(r.status, 200)
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