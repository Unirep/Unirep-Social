import base64url from 'base64url'
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'

import {
    validateEthAddress,
    contractExists,
} from './utils'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'

import { genUnirepStateFromContract } from '../core'
import { add0x } from '../crypto/SMT'

import UnirepSocial from "../artifacts/contracts/UnirepSocial.sol/UnirepSocial.json"
import { epkProofPrefix } from './prefix'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'verifyEpochKeyProof',
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
        '-epk', '--epoch-key',
        {
            required: true,
            type: 'str',
            help: 'The user\'s epoch key (in hex representation)',
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
}

const verifyEpochKeyProof = async (args: any) => {

    // Unirep Social contract
    if (!validateEthAddress(args.contract)) {
        console.error('Error: invalid contract address')
        return
    }

    const unirepSocialAddress = args.contract

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER

    const provider = new hardhatEthers.providers.JsonRpcProvider(ethProvider)

    if (! await contractExists(provider, unirepSocialAddress)) {
        console.error('Error: there is no contract deployed at the specified address')
        return
    }
    
    const startBlock = (args.start_block) ? args.start_block : DEFAULT_START_BLOCK
    const unirepSocialContract = new ethers.Contract(
        unirepSocialAddress,
        UnirepSocial.abi,
        provider,
    )

    const unirepAddress = unirepSocialContract.unirep()
    const unirepState = await genUnirepStateFromContract(
        provider,
        unirepAddress,
        startBlock,
    )

    const currentEpoch = unirepState.currentEpoch
    const GSTRoot = unirepState.genGSTree(currentEpoch).root
    const epk = BigInt(add0x(args.epoch_key))
    const decodedProof = base64url.decode(args.proof.slice(epkProofPrefix.length))
    const proof = JSON.parse(decodedProof)
    
    const isProofValid = await unirepSocialContract.verifyEpochKeyValidity(
        GSTRoot,
        currentEpoch,
        epk,
        proof,
    )
    if (!isProofValid) {
        console.error('Error: invalid epoch key proof')
        return
    }
    console.log(`Verify epoch key proof with epoch key ${args.epoch_key} succeed`)
}

export {
    verifyEpochKeyProof,
    configureSubparser,
}