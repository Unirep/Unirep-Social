import { BigNumberish, ethers } from 'ethers'
import { ZkIdentity } from '@unirep/crypto'
import { defaultProver } from '@unirep-social/circuits/provers/defaultProver'
import * as config from '@unirep/circuits'
import { schema } from '@unirep/core'
import { SocialUserState } from '../src/UserState'
import { getUnirepContract } from '@unirep/contracts'
import { DB, SQLiteConnector } from 'anondb/node'
import { expect } from 'chai'
import { UnirepSocial } from '../typechain/UnirepSocial'

export type Field = BigNumberish

export const getTreeDepthsForTesting = (deployEnv: string = 'circuit') => {
    if (deployEnv === 'contract') {
        return {
            userStateTreeDepth: config.USER_STATE_TREE_DEPTH,
            globalStateTreeDepth: config.GLOBAL_STATE_TREE_DEPTH,
            epochTreeDepth: config.EPOCH_TREE_DEPTH,
        }
    } else if (deployEnv === 'circuit') {
        return {
            userStateTreeDepth: config.USER_STATE_TREE_DEPTH,
            globalStateTreeDepth: config.GLOBAL_STATE_TREE_DEPTH,
            epochTreeDepth: config.EPOCH_TREE_DEPTH,
        }
    } else {
        throw new Error('Only contract and circuit testing env are supported')
    }
}

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

export const submitUSTProofs = async (
    contract: ethers.Contract,
    { startTransitionProof, processAttestationProofs, finalTransitionProof }
) => {
    const proofIndexes: number[] = []

    {
        // submit proofs
        const isValid = await startTransitionProof.verify()
        expect(isValid).to.be.true
        const tx = await contract.startUserStateTransition(
            startTransitionProof.publicSignals,
            startTransitionProof.proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).to.equal(1)

        // submit twice should fail
        await expect(
            contract.startUserStateTransition(
                startTransitionProof.publicSignals,
                startTransitionProof.proof
            )
        ).to.be.revertedWithCustomError(contract, 'ProofAlreadyUsed')

        const hashedProof = startTransitionProof.hash()
        proofIndexes.push(Number(await contract.getProofIndex(hashedProof)))
    }

    for (let i = 0; i < processAttestationProofs.length; i++) {
        const isValid = await processAttestationProofs[i].verify()
        expect(isValid).to.be.true

        const tx = await contract.processAttestations(
            processAttestationProofs[i].publicSignals,
            processAttestationProofs[i].proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).to.equal(1)

        // submit random process attestations should success and not affect the results
        // const falseInput = BigNumber.from(genRandomSalt())
        // await contract
        //     .processAttestations(
        //         processAttestationProofs[i].outputBlindedUserState,
        //         processAttestationProofs[i].outputBlindedHashChain,
        //         falseInput,
        //         formatProofForVerifierContract(
        //             processAttestationProofs[i].proof
        //         )
        //     )
        //     .then((t) => t.wait())

        // submit twice should fail
        await expect(
            contract.processAttestations(
                processAttestationProofs[i].publicSignals,
                processAttestationProofs[i].proof
            )
        ).to.be.revertedWithCustomError(contract, 'ProofAlreadyUsed')

        const hashedProof = processAttestationProofs[i].hash()
        proofIndexes.push(Number(await contract.getProofIndex(hashedProof)))
    }

    {
        const isValid = await finalTransitionProof.verify()
        expect(isValid).to.be.true
        const tx = await contract.updateUserStateRoot(
            finalTransitionProof.publicSignals,
            finalTransitionProof.proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).to.equal(1)

        // submit twice should fail
        await expect(
            contract.updateUserStateRoot(
                finalTransitionProof.publicSignals,
                finalTransitionProof.proof
            )
        ).to.be.revertedWithCustomError(contract, 'ProofAlreadyUsed')
    }
}

export const publishPost = async (
    contract: UnirepSocial,
    provider: ethers.providers.Provider
) => {
    const unirep = await contract.unirep()
    const unirepContract = getUnirepContract(unirep, provider)
    const attestingFee = await unirepContract.attestingFee()
    const attesterId = (
        await unirepContract.attesters(contract.address)
    ).toBigInt()
    const defaultPostReputation = (await contract.postReputation()).toBigInt()

    const id = new ZkIdentity()
    await contract.userSignUp(id.genIdentityCommitment()).then((t) => t.wait())
    const userState = await genUserState(provider, unirepContract.address, id)
    const proveGraffiti = BigInt(0)
    const minPosRep = 0
    const graffitiPreImage = BigInt(0)
    const epkNonce = 0
    const reputationProof = await userState.genProveReputationProof(
        attesterId,
        epkNonce,
        minPosRep,
        proveGraffiti,
        graffitiPreImage,
        defaultPostReputation
    )
    const isValid = await reputationProof.verify()
    expect(isValid, 'Verify reputation proof off-chain failed').to.be.true

    const isProofValid = await unirepContract.verifyReputation(
        reputationProof.publicSignals,
        reputationProof.proof
    )
    expect(isProofValid, 'proof is not valid').to.be.true

    const content = 'some post text'
    const hashedContent = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(content)
    )
    const tx = await contract.publishPost(
        hashedContent,
        reputationProof.publicSignals,
        reputationProof.proof,
        { value: attestingFee }
    )
    const receipt = await tx.wait()
    expect(receipt.status, 'Submit post failed').to.equal(1)
    return receipt
}

export const leaveComment = async (
    contract: UnirepSocial,
    provider: ethers.providers.Provider,
    postId: string
) => {
    const unirep = await contract.unirep()
    const unirepContract = getUnirepContract(unirep, provider)
    const attestingFee = await unirepContract.attestingFee()
    const attesterId = (
        await unirepContract.attesters(contract.address)
    ).toBigInt()
    const defaultCommentReputation = (
        await contract.commentReputation()
    ).toBigInt()

    const id = new ZkIdentity()
    await contract.userSignUp(id.genIdentityCommitment()).then((t) => t.wait())
    const userState = await genUserState(provider, unirepContract.address, id)
    const proveGraffiti = BigInt(0)
    const minPosRep = 20,
        graffitiPreImage = BigInt(0)
    const epkNonce = 0
    const reputationProof = await userState.genProveReputationProof(
        attesterId,
        epkNonce,
        minPosRep,
        proveGraffiti,
        graffitiPreImage,
        defaultCommentReputation
    )
    const isValid = await reputationProof.verify()
    expect(isValid, 'Verify reputation proof off-chain failed').to.be.true

    const isProofValid = await unirepContract.verifyReputation(
        reputationProof.publicSignals,
        reputationProof.proof
    )
    expect(isProofValid, 'proof is not valid').to.be.true

    const content = 'some comment text'
    const hashedContent = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(content)
    )
    const tx = await contract.leaveComment(
        postId,
        hashedContent,
        reputationProof.publicSignals,
        reputationProof.proof,
        { value: attestingFee }
    )
    const receipt = await tx.wait()
    expect(receipt.status, 'Submit comment failed').to.equal(1)
}
