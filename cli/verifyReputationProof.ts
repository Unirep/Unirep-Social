import base64url from 'base64url'
import { ethers } from 'ethers'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { genUnirepStateFromContract, maxReputationBudget } from '@unirep/unirep'
import { reputationProofPrefix, reputationPublicSignalsPrefix } from './prefix'
import { UnirepSocialContract } from '../core/UnirepSocialContract'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'verifyReputationProof',
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
        '-ep', '--epoch',
        {
            action: 'store',
            type: 'int',
            help: 'The latest epoch user transitioned to. Default: current epoch',
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
}

const verifyReputationProof = async (args: any) => {

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER
    const provider = new ethers.providers.JsonRpcProvider(ethProvider)

    // Unirep Social contract
    const unirepSocialContract = new UnirepSocialContract(args.contract, ethProvider)
    // Unirep contract
    const unirepContract = await unirepSocialContract.getUnirep()
    
    const unirepState = await genUnirepStateFromContract(
        provider,
        unirepContract.address,
    )

    // Parse Inputs
    const decodedProof = base64url.decode(args.proof.slice(reputationProofPrefix.length))
    const decodedPublicSignals = base64url.decode(args.public_signals.slice(reputationPublicSignalsPrefix.length))
    const publicSignals = JSON.parse(decodedPublicSignals)
    const outputNullifiers = publicSignals.slice(0, maxReputationBudget)
    const epoch = publicSignals[maxReputationBudget]
    const epk = publicSignals[maxReputationBudget + 1]
    const GSTRoot = publicSignals[maxReputationBudget + 2]
    const attesterId = publicSignals[maxReputationBudget + 3]
    const repNullifiersAmount = publicSignals[maxReputationBudget + 4]
    const minRep = publicSignals[maxReputationBudget + 5]
    const proveGraffiti = publicSignals[maxReputationBudget + 6]
    const graffitiPreImage = publicSignals[maxReputationBudget + 7]
    const proof = JSON.parse(decodedProof)

    // Check if Global state tree root exists
    const isGSTRootExisted = unirepState.GSTRootExists(GSTRoot, epoch)
    if(!isGSTRootExisted) {
        console.error('Error: invalid global state tree root')
        process.exit(0)
    }

    // Check if attester is correct
    const unirepSocialId = await unirepSocialContract.attesterId()
    if(Number(unirepSocialId) != Number(attesterId)) {
        console.error('Error: wrong attester ID proof')
        process.exit(0)
    }

    // Verify the proof on-chain
    const isProofValid = await unirepSocialContract.verifyReputation(
        publicSignals,
        proof,
    )
    if (!isProofValid) {
        console.error('Error: invalid reputation proof')
        process.exit(0)
    }

    console.log(`Verify reputation proof of epoch key ${epk.toString(16)} with ${repNullifiersAmount} reputation spent in transaction and minimum reputation ${minRep} succeed`)
}

export {
    verifyReputationProof,
    configureSubparser,
}