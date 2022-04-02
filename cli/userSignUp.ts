import base64url from 'base64url'
import { BigNumber, ethers } from 'ethers'
import { contracts } from 'unirep'

import { DEFAULT_ETH_PROVIDER, DEFAULT_PRIVATE_KEY } from './defaults'
import { identityCommitmentPrefix } from './prefix'
import { UnirepSocialFactory } from '../core/utils'
import { getProvider } from './utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('userSignUp', { add_help: true })

    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
    })

    parser.add_argument('-c', '--identity-commitment', {
        required: true,
        type: 'str',
        help: "The user's identity commitment (in hex representation)",
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

const userSignUp = async (args: any) => {
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
    const unirepContract = contracts.UnirepFactory.connect(
        unirepContractAddr,
        provider
    )

    // Connect a signer
    const privKey = args.eth_privkey ? args.eth_privkey : DEFAULT_PRIVATE_KEY
    const wallet = new ethers.Wallet(privKey, provider)

    // Parse identity commitment
    const encodedCommitment = args.identity_commitment.slice(
        identityCommitmentPrefix.length
    )
    const decodedCommitment = base64url.decode(encodedCommitment)
    const commitment = BigNumber.from('0x' + decodedCommitment)

    // Submit the user sign up transaction
    let tx
    try {
        tx = await unirepSocialContract
            .connect(wallet)
            .userSignUp(commitment, { gasLimit: 100000 })
    } catch (error) {
        console.log('Transaction Error', error)
        return
    }
    await tx.wait()
    const epoch = await unirepContract.currentEpoch()

    console.log('Transaction hash:', tx?.hash)
    console.log('Sign up epoch:', epoch.toString())
}

export { userSignUp, configureSubparser }
