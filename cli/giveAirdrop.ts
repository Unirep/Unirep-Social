import base64url from 'base64url'
import { ethers } from 'ethers'
import { SignUpProof } from '@unirep/contracts'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'

import { DEFAULT_ETH_PROVIDER, DEFAULT_PRIVATE_KEY } from './defaults'
import { signUpProofPrefix, signUpPublicSignalsPrefix } from './prefix'
import { UnirepSocialContract } from '../core/UnirepSocialContract'
import { verifyAirdropProof } from './verifyAirdropProof'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'giveAirdrop',
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
        '-p', '--public-signals',
        {
            required: true,
            type: 'str',
            help: 'The snark public signals of the user\'s epoch key ',
        }
    )

    parser.add_argument(
        '-pf', '--proof',
        {
            required: true,
            type: 'str',
            help: 'The snark proof of the user\'s epoch key ',
        }
    )

    parser.add_argument(
        '-b', '--start-block',
        {
            action: 'store',
            type: 'int',
            help: 'The block the Unirep contract is deployed. Default: 0',
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

const giveAirdrop = async (args: any) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER
    const provider = new ethers.providers.WebSocketProvider(ethProvider)

    // Unirep Social contract
    const unirepSocialContract = new UnirepSocialContract(args.contract, provider)

    // Parse Inputs
    const decodedProof = base64url.decode(args.proof.slice(signUpProofPrefix.length))
    const decodedPublicSignals = base64url.decode(args.public_signals.slice(signUpPublicSignalsPrefix.length))
    const publicSignals = JSON.parse(decodedPublicSignals)
    const proof = JSON.parse(decodedProof)
    const signUpProof = new SignUpProof(publicSignals, formatProofForSnarkjsVerification(proof))
    const epk = signUpProof.epochKey

    // Verify reputation proof
    await verifyAirdropProof(args)

    // Connect a signer
    const privKey = args.eth_privkey ? args.eth_privkey : DEFAULT_PRIVATE_KEY
    await unirepSocialContract.unlock(privKey)

    let tx
    try {
        tx = await unirepSocialContract.airdrop(signUpProof)
    } catch (error) {
        console.log('Transaction Error', error)
        return
    }
    
    console.log(`The user of epoch key ${epk} will get airdrop in the next epoch`)
    console.log('Transaction hash:', tx?.hash)
}

export {
    giveAirdrop,
    configureSubparser,
}