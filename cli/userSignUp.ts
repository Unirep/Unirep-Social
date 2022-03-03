import base64url from 'base64url'
import { ethers } from 'ethers'
import { add0x } from '@unirep/crypto'

import { DEFAULT_ETH_PROVIDER, DEFAULT_PRIVATE_KEY } from './defaults'
import { identityCommitmentPrefix } from './prefix'
import { UnirepSocialContract } from '../core/UnirepSocialContract'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'userSignUp',
        { add_help: true },
    )

    parser.add_argument(
        '-e', '--eth-provider',
        {
            action: 'store',
            type: 'str',
            help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
        }
    )

    parser.add_argument(
        '-c', '--identity-commitment',
        {
            required: true,
            type: 'str',
            help: 'The user\'s identity commitment (in hex representation)',
        }
    )

    parser.add_argument(
        '-x', '--contract',
        {
            required: true,
            type: 'str',
            help: 'The Unirep Social contract address',
        }
    )

    parser.add_argument(
        '-d', '--eth-privkey',
        {
            action: 'store',
            type: 'str',
            help: 'The deployer\'s Ethereum private key. Default: set in the `.env` file',
        }
    )
}

const userSignUp = async (args: any) => {

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER
    const provider = new ethers.providers.WebSocketProvider(ethProvider)

    // Unirep Social contract
    const unirepSocialContract = new UnirepSocialContract(args.contract, provider)

    // Connect a signer
    const privKey = args.eth_privkey ? args.eth_privkey : DEFAULT_PRIVATE_KEY
    await unirepSocialContract.unlock(privKey)

    // Parse identity commitment
    const encodedCommitment = args.identity_commitment.slice(identityCommitmentPrefix.length)
    const decodedCommitment = base64url.decode(encodedCommitment)
    const commitment = add0x(decodedCommitment)

    // Submit the user sign up transaction
    let tx
    try {
        tx = await unirepSocialContract.userSignUp(commitment)
    } catch (error) {
        console.log('Transaction Error', error)
        return
    }
    await tx.wait()
    const epoch = await unirepSocialContract.currentEpoch()

    console.log('Transaction hash:', tx?.hash)
    console.log('Sign up epoch:', epoch.toString())
}

export {
    userSignUp,
    configureSubparser,
}