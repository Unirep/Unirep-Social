import base64url from 'base64url'
import { ethers } from 'ethers'
import {
    Circuit,
    formatProofForVerifierContract,
    verifyProof,
} from '@unirep/circuits'
import { genUserState } from '@unirep/core'
import { ZkIdentity } from '@unirep/crypto'
import { DEFAULT_ETH_PROVIDER, DEFAULT_PRIVATE_KEY } from './defaults'
import { identityPrefix } from './prefix'
import { UnirepSocialFactory } from '../core/utils'
import {
    computeStartTransitionProofHash,
    UnirepFactory,
} from '@unirep/contracts'
import { getProvider } from './utils'

// TODO: use export package from '@unirep/unirep'
import { UserTransitionProof } from '../test/utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('userStateTransition', {
        add_help: true,
    })

    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
    })

    parser.add_argument('-id', '--identity', {
        required: true,
        type: 'str',
        help: "The (serialized) user's identity",
    })

    parser.add_argument('-b', '--start-block', {
        action: 'store',
        type: 'int',
        help: 'The block the Unirep contract is deployed. Default: 0',
    })

    parser.add_argument('-x', '--contract', {
        required: true,
        type: 'str',
        help: 'The Unirep Social contract address',
    })

    parser.add_argument('-d', '--eth-privkey', {
        action: 'store',
        type: 'str',
        help: "The deployer's Ethereum private key. Default: set in the `.env` file",
    })
}

const userStateTransition = async (args: any) => {
    // Ethereum provider
    const ethProvider = args.eth_provider
        ? args.eth_provider
        : DEFAULT_ETH_PROVIDER
    const provider = getProvider(ethProvider)

    // Unirep Social contract
    const unirepSocialContract = UnirepSocialFactory.connect(
        args.contract,
        provider
    )
    const unirepContractAddr = await unirepSocialContract.unirep()
    // Unirep contract
    const unirepContract = new ethers.Contract(
        unirepContractAddr,
        UnirepFactory.abi,
        provider
    )

    // Connect a signer
    const privKey = args.eth_privkey ? args.eth_privkey : DEFAULT_PRIVATE_KEY
    const wallet = new ethers.Wallet(privKey, provider)

    // Gen epoch key proof
    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = new ZkIdentity(2, decodedIdentity)
    const userState = await genUserState(
        provider,
        unirepContract.address,
        id as any // TODO
    )
    const results = await userState.genUserStateTransitionProofs()

    // Start user state transition proof
    let isValid = await verifyProof(
        Circuit.startTransition,
        results.startTransitionProof.proof,
        results.startTransitionProof.publicSignals
    )
    if (!isValid) {
        console.error(
            'Error: start state transition proof generated is not valid!'
        )
        return
    }

    // Process attestations proofs
    for (let i = 0; i < results.processAttestationProofs.length; i++) {
        const isValid = await verifyProof(
            Circuit.processAttestations,
            results.processAttestationProofs[i].proof,
            results.processAttestationProofs[i].publicSignals
        )
        if (!isValid) {
            console.error(
                'Error: process attestations proof generated is not valid!'
            )
            return
        }
    }

    // User state transition proof
    isValid = await verifyProof(
        Circuit.userStateTransition,
        results.finalTransitionProof.proof,
        results.finalTransitionProof.publicSignals
    )
    if (!isValid) {
        console.error(
            'Error: user state transition proof generated is not valid!'
        )
        return
    }

    // submit user state transition proofs
    const txPromises = [] as Promise<any>[]
    const { blindedUserState, blindedHashChain, globalStateTreeRoot, proof } =
        results.startTransitionProof
    {
        const tx = await unirepSocialContract
            .connect(wallet)
            .startUserStateTransition(
                blindedUserState,
                blindedHashChain,
                globalStateTreeRoot,
                formatProofForVerifierContract(proof)
            )
        txPromises.push(tx.wait())
    }

    for (let i = 0; i < results.processAttestationProofs.length; i++) {
        const {
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            proof,
        } = results.processAttestationProofs[i]
        const tx = await unirepSocialContract
            .connect(wallet)
            .processAttestations(
                outputBlindedUserState,
                outputBlindedHashChain,
                inputBlindedUserState,
                formatProofForVerifierContract(proof)
            )
        txPromises.push(tx.wait())
    }
    await Promise.all(txPromises)

    const proofIndexes: number[] = []
    {
        const proofNullifier = computeStartTransitionProofHash(
            blindedUserState,
            blindedHashChain,
            globalStateTreeRoot,
            formatProofForVerifierContract(proof)
        )
        const proofIndex = await unirepContract.getProofIndex(proofNullifier)
        proofIndexes.push(Number(proofIndex))
    }
    for (let i = 0; i < results.processAttestationProofs.length; i++) {
        const {
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            proof,
        } = results.processAttestationProofs[i]
        const proofNullifier = computeStartTransitionProofHash(
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            formatProofForVerifierContract(proof)
        )
        const proofIndex = await unirepContract.getProofIndex(proofNullifier)
        proofIndexes.push(Number(proofIndex))
    }
    const USTProof = new UserTransitionProof(
        results.finalTransitionProof.publicSignals,
        results.finalTransitionProof.proof
    )
    let tx
    try {
        tx = await unirepSocialContract
            .connect(wallet)
            .updateUserStateRoot(USTProof, proofIndexes)
        await tx.wait()
    } catch (error) {
        console.log('Transaction error: ', error)
    }

    const fromEpoch = userState.latestTransitionedEpoch
    const toEpoch = userState.getUnirepStateCurrentEpoch()

    console.log(`User transitioned from epoch ${fromEpoch} to epoch ${toEpoch}`)
}

export { userStateTransition, configureSubparser }
