import base64url from 'base64url'
import { ethers } from 'ethers'
import { add0x, genIdentityCommitment, unSerialiseIdentity } from '@unirep/crypto'
import { verifyProof } from '@unirep/circuits'
import { genUnirepStateFromContract } from '@unirep/unirep'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'
import { identityPrefix, signUpProofPrefix, signUpPublicSignalsPrefix } from './prefix'
import { UnirepSocialContract } from '../core/UnirepSocialContract'

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

const giveAirdrop = async (args: any) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER
    const provider = new ethers.providers.JsonRpcProvider(ethProvider)

    // Unirep Social contract
    const unirepSocialContract = new UnirepSocialContract(args.contract, ethProvider)
    // Unirep contract
    const unirepContract = await unirepSocialContract.getUnirep()

    const startBlock = (args.start_block) ? args.start_block : DEFAULT_START_BLOCK
    const unirepState = await genUnirepStateFromContract(
        provider,
        unirepContract.address,
        startBlock,
    )

    // Parse Inputs
    const decodedProof = base64url.decode(args.proof.slice(signUpProofPrefix.length))
    const decodedPublicSignals = base64url.decode(args.public_signals.slice(signUpPublicSignalsPrefix.length))
    const publicSignals = JSON.parse(decodedPublicSignals)
    const epoch = publicSignals[0]
    const epk = publicSignals[1]
    const GSTRoot = publicSignals[2]
    const attesterId = publicSignals[3]
    const proof = JSON.parse(decodedProof)

    // Verify proof
    // Check if attester ID matches Unirep Social
    const _attesterId = await unirepSocialContract.attesterId()
    if(_attesterId.toNumber() != attesterId) {
        console.error('Error: invalid attester ID proof')
        return
    }

    // Check if Global state tree root exists
    const isGSTRootExisted = unirepState.GSTRootExists(GSTRoot, epoch)
    if(!isGSTRootExisted) {
        console.error('Error: invalid global state tree root')
        return
    }

    // Verify the proof on-chain
    const isProofValid = await unirepSocialContract.verifyUserSignUp(
        publicSignals,
        proof,
    )
    if (!isProofValid) {
        console.error('Error: invalid user sign up proof')
        return
    }

    // Connect a signer
    await unirepSocialContract.unlock(args.eth_privkey)
    // submit epoch key to unirep social contract
    const tx = await unirepSocialContract.airdrop(publicSignals, proof)

    if(tx != undefined){
        console.log(`The user of epoch key ${epk} will get airdrop in the next epoch`)
        console.log('Transaction hash:', tx?.hash)
    }
    process.exit(0)
}

export {
    giveAirdrop,
    configureSubparser,
}