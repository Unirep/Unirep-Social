import { BigNumberish, ethers } from 'ethers'
import { ZkIdentity } from '@unirep/crypto'
import { defaultProver } from '@unirep-social/circuits/provers/defaultProver'
import * as config from '@unirep/circuits'
import { schema } from '@unirep/core'
import { SocialUserState } from '../src/UserState'
import { getUnirepContract } from '@unirep/contracts'
import { DB, SQLiteConnector } from 'anondb/node'
import { expect } from 'chai'

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
