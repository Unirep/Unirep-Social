import base64url from 'base64url'
import { ethers } from 'ethers'
import { genIdentityCommitment, unSerialiseIdentity } from '@unirep/crypto'
import { verifyProof } from '@unirep/circuits'
import { genUserStateFromContract } from '@unirep/unirep'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'
import { identityPrefix } from './prefix'
import { UnirepSocialContract } from '../core/UnirepSocialContract'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'getAirdrop',
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
        '-id', '--identity',
        {
            required: true,
            type: 'str',
            help: 'The (serialized) user\'s identity',
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

    const privkeyGroup = parser.add_mutually_exclusive_group({ required: true })

    privkeyGroup.add_argument(
        '-dp', '--prompt-for-eth-privkey',
        {
            action: 'store_true',
            help: 'Whether to prompt for the user\'s Ethereum private key and ignore -d / --eth-privkey',
        }
    )

    privkeyGroup.add_argument(
        '-d', '--eth-privkey',
        {
            action: 'store',
            type: 'str',
            help: 'The deployer\'s Ethereum private key',
        }
    )
}

const getAirdrop = async (args: any) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER
    const provider = new ethers.providers.JsonRpcProvider(ethProvider)

    // Unirep Social contract
    const unirepSocialContract = new UnirepSocialContract(args.contract, ethProvider)
    // Unirep contract
    const unirepContract = await unirepSocialContract.getUnirep()
    
    const startBlock = (args.start_block) ? args.start_block : DEFAULT_START_BLOCK

    // Airdrop is only given to epoch key with nonce = 0
    const epkNonce = 0

    // Gen epoch key proof
    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = unSerialiseIdentity(decodedIdentity)
    const commitment = genIdentityCommitment(id)
    const userState = await genUserStateFromContract(
        provider,
        unirepContract.address,
        startBlock,
        id,
        commitment,
    )
    const results = await userState.genVerifyEpochKeyProof(epkNonce)

    // TODO: Not sure if this validation is necessary
    const isValid = await verifyProof('verifyEpochKey', results.proof, results.publicSignals)
    if(!isValid) {
        console.error('Error: epoch key proof generated is not valid!')
        return
    }

    // Connect a signer
    await unirepSocialContract.unlock(args.eth_privkey)
    // submit epoch key to unirep social contract
    const tx = await unirepSocialContract.airdrop(results.epochKey)

    if(tx != undefined){
        console.log(`The user of epoch key ${results.epochKey} will get airdrop in the next epoch`)
        console.log('Transaction hash:', tx?.hash)
    }
    process.exit(0)
}

export {
    getAirdrop,
    configureSubparser,
}