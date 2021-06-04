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

import Unirep from "../artifacts/contracts/Unirep.sol/Unirep.json"
import { reputationProofPrefix } from './prefix'
import { hash5 } from 'maci-crypto'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.addParser(
        'verifyReputationProof',
        { addHelp: true },
    )

    parser.addArgument(
        ['-e', '--eth-provider'],
        {
            action: 'store',
            type: 'string',
            help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
        }
    )

    parser.addArgument(
        ['-ep', '--epoch'],
        {
            action: 'store',
            type: 'int',
            help: 'The latest epoch user transitioned to. Default: current epoch',
        }
    )

    parser.addArgument(
        ['-epk', '--epoch-key'],
        {
            required: true,
            type: 'string',
            help: 'The user\'s epoch key (in hex representation)',
        }
    )

    parser.addArgument(
        ['-pf', '--proof'],
        {
            required: true,
            type: 'string',
            help: 'The snark proof of the user\'s epoch key and reputation ',
        }
    )

    parser.addArgument(
        ['-act', '--action'],
        {
            required: true,
            type: 'string',
            help: 'Which action the user spends reputation',
        }
    )

    parser.addArgument(
        ['-th', '--transaction-hash'],
        {
            required: true,
            type: 'string',
            help: 'The transaction hash of where user submit the reputation nullifiers ',
        }
    )

    parser.addArgument(
        ['-mr', '--min-rep'],
        {
            type: 'int',
            help: 'The minimum reputation score the user has',
        }
    )

    parser.addArgument(
        ['-b', '--start-block'],
        {
            action: 'store',
            type: 'int',
            help: 'The block the Unirep contract is deployed. Default: 0',
        }
    )

    parser.addArgument(
        ['-x', '--contract'],
        {
            required: true,
            type: 'string',
            help: 'The Unirep contract address',
        }
    )
}

const verifyReputationProof = async (args: any) => {

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

    enum actions { 
        publishPost,
        leaveComment,
        vote
    }

    if (!(args.action in actions)) {
        console.error(`Error: there is no such action ${args.action}`)
        return
    }

    const unirepContract = new ethers.Contract(
        unirepAddress,
        Unirep.abi,
        provider,
    )

    const startBlock = (args.start_block) ? args.start_block : DEFAULT_START_BLOCK
    const unirepState = await genUnirepStateFromContract(
        provider,
        unirepAddress,
        startBlock,
    )

    // Verify on-chain
    const currentEpoch = unirepState.currentEpoch
    const GSTRoot = unirepState.genGSTree(currentEpoch).root
    const nullifierTree = await unirepState.genNullifierTree()
    const nullifierTreeRoot = nullifierTree.getRootHash()
    const epk = BigInt(add0x(args.epoch_key))
    
    // get reputation nullifiers from contract
    const tx = await provider.getTransaction(args.transaction_hash)
    const iface = new ethers.utils.Interface(Unirep.abi)
    const decodedData = iface.decodeFunctionData(args.action, tx.data)
    const nullifiers = decodedData['karmaNullifiers'].map((n) => BigInt(n))

    const proveKarmaNullifiers = BigInt(1)
    let proveKarmaAmount: number = 0
    const default_nullifier = hash5([BigInt(0),BigInt(0),BigInt(0),BigInt(0),BigInt(0)])
    for (let i = 0; i < nullifiers.length; i++) {
        if (nullifiers[i] != default_nullifier) {
            proveKarmaAmount ++
        }
    }

    // get minRep
    const proveMinRep = args.min_rep != null ? BigInt(1) : BigInt(0)
    const minRep = args.min_rep != null ? BigInt(args.min_rep) : BigInt(0)

    const decodedProof = base64url.decode(args.proof.slice(reputationProofPrefix.length))
    const proof = JSON.parse(decodedProof)
    
    const publicInput = nullifiers.concat([
        currentEpoch,
        epk,
        GSTRoot,
        nullifierTreeRoot,
        proveKarmaNullifiers,
        proveKarmaAmount,
        proveMinRep,
        minRep
    ])

    const isProofValid = await unirepContract.verifyReputation(
        publicInput,
        proof
    )
    if (!isProofValid) {
        console.error('Error: invalid reputation proof')
        return
    }

    console.log(`Verify reputation proof of epoch key ${epk.toString(16)} with ${proveKarmaAmount} reputation spent in ${args.transaction_hash} transaction and minimum reputation ${minRep} succeed`)
}

export {
    verifyReputationProof,
    configureSubparser,
}