import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'

import {
    validateEthAddress,
    contractExists,
} from './utils'

import { DEFAULT_ETH_PROVIDER } from './defaults'

import Unirep from "../artifacts/contracts/Unirep.sol/Unirep.json"

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'listAllPosts',
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
        '-x', '--contract',
        {
            required: true,
            type: 'str',
            help: 'The Unirep contract address',
        }
    )
}

const listAllPosts = async (args: any) => {

    // Unirep contract
    if (!validateEthAddress(args.contract)) {
        console.error('Error: invalid Unirep contract address')
        return
    }

    const unirepAddress = args.contract

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER

    const provider = new hardhatEthers.providers.JsonRpcProvider(ethProvider)

    if (! await contractExists(provider, unirepAddress)) {
        console.error('Error: there is no contract deployed at the specified address')
        return
    }
    
    const unirepContract = new ethers.Contract(
        unirepAddress,
        Unirep.abi,
        provider
    )

    let postEvents
    const postFilter = unirepContract.filters.PostSubmitted()
    postEvents = await unirepContract.queryFilter(postFilter)

    for (let i = 0; i < postEvents.length; i++) {
        console.log('Post ', postEvents[i].args._postId.toString())
        console.log('Epoch key ', postEvents[i].args._epochKey.toString())
        console.log('Content ', postEvents[i].args._hahsedContent)
    }
}

export {
    listAllPosts,
    configureSubparser,
}