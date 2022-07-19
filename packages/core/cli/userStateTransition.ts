import base64url from 'base64url'
import { ethers } from 'ethers'
import { ZkIdentity } from '@unirep/crypto'
import { DEFAULT_ETH_PROVIDER, DEFAULT_PRIVATE_KEY } from './defaults'
import { identityPrefix } from './prefix'
import { UnirepSocialFactory } from '../src/utils'
import { UnirepFactory } from '@unirep/contracts'
import { getProvider } from './utils'
import { genUserState } from './test/utils'

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
    const {
        startTransitionProof,
        processAttestationProofs,
        finalTransitionProof,
    } = await userState.genUserStateTransitionProofs()

    // Start user state transition proof
    if (!(await startTransitionProof.verify())) {
        console.error(
            'Error: start state transition proof generated is not valid!'
        )
        return
    }

    // Process attestations proofs
    for (let i = 0; i < processAttestationProofs.length; i++) {
        const isValid = await processAttestationProofs[i].verify()
        if (!isValid) {
            console.error(
                'Error: process attestations proof generated is not valid!'
            )
            return
        }
    }

    // User state transition proof
    if (!(await finalTransitionProof.verify())) {
        console.error(
            'Error: user state transition proof generated is not valid!'
        )
        return
    }

    // submit user state transition proofs
    const txPromises = [] as Promise<any>[]
    {
        const tx = await unirepSocialContract
            .connect(wallet)
            .startUserStateTransition(
                startTransitionProof.publicSignals,
                startTransitionProof.proof
            )
        txPromises.push(tx.wait())
    }

    for (let i = 0; i < processAttestationProofs.length; i++) {
        const tx = await unirepSocialContract
            .connect(wallet)
            .processAttestations(
                processAttestationProofs[i].publicSignals,
                processAttestationProofs[i].proof
            )
        txPromises.push(tx.wait())
    }
    await Promise.all(txPromises)

    const proofIndexes: number[] = []
    {
        const proofNullifier = startTransitionProof.hash()
        const proofIndex = await unirepContract.getProofIndex(proofNullifier)
        proofIndexes.push(Number(proofIndex))
    }
    for (let i = 0; i < processAttestationProofs.length; i++) {
        const proofNullifier = processAttestationProofs[i].hash()
        const proofIndex = await unirepContract.getProofIndex(proofNullifier)
        proofIndexes.push(Number(proofIndex))
    }
    try {
        const tx = await unirepSocialContract
            .connect(wallet)
            .updateUserStateRoot(
                finalTransitionProof.publicSignals,
                finalTransitionProof.proof,
                proofIndexes
            )
        await tx.wait()
    } catch (error) {
        console.log('Transaction error: ', error)
    }

    const fromEpoch = await userState.latestTransitionedEpoch()
    const toEpoch = await userState.getUnirepStateCurrentEpoch()

    console.log(`User transitioned from epoch ${fromEpoch} to epoch ${toEpoch}`)
}

export { userStateTransition, configureSubparser }
