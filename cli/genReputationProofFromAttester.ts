import base64url from 'base64url'
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { genIdentityCommitment, unSerialiseIdentity } from 'libsemaphore'

import {
    validateEthAddress,
    contractExists,
} from './utils'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'

import { genUserStateFromContract } from '../core'
import UnirepSocial from "../artifacts/contracts/UnirepSocial.sol/UnirepSocial.json"
import { formatProofForVerifierContract, genVerifyReputationFromAttesterProofAndPublicSignals, verifyProveReputationFromAttesterProof } from '../circuits/utils'
import { stringifyBigInts } from 'maci-crypto'
import { add0x } from '../crypto/SMT'
import { identityPrefix, reputationProofFromAttesterPrefix } from './prefix'
import { genProveReputationFromAttesterCircuitInputsFromDB } from '../database/utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'genReputationProofFromAttester',
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
        '-a', '--attester-id',
        {
            required: true,
            type: 'str',
            help: 'The attester id (in hex representation)',
        }
    )
    
    parser.add_argument(
        '-mp', '--min-pos-rep',
        {
            type: 'int',
            help: 'The minimum positive score the attester given to the user',
        }
    )

    parser.add_argument(
        '-mn', '--max-neg-rep',
        {
            type: 'int',
            help: 'The maximum negative score the attester given to the user',
        }
    )

    parser.add_argument(
        '-md', '--min-rep-diff',
        {
            type: 'int',
            help: 'The difference between positive and negative scores the attester given to the user',
        }
    )

    parser.add_argument(
        '-gp', '--graffiti-preimage',
        {
            type: 'str',
            help: 'The pre-image of the graffiti for the reputation the attester given to the user (in hex representation)',
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
        '-db', '--from-database',
        {
            action: 'store_true',
            help: 'Indicate if to generate proving circuit from database',
        }
    )
}

const genReputationProofFromAttester = async (args: any) => {

    // Warning is there is no reputation and graffiti to prove
    if (!args.min_pos_rep && !args.max_neg_rep && !args.graffiti_preimage) {
        console.warn('Warning: no reputation and graffiti to prove')
    }
    
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

    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = unSerialiseIdentity(decodedIdentity)
    const commitment = genIdentityCommitment(id)

    const unirepSocialContract = new ethers.Contract(
        unirepSocialAddress,
        UnirepSocial.abi,
        provider,
    )

    const unirepAddress = await unirepSocialContract.unirep()

    // Gen reputation proof
    const userState = await genUserStateFromContract(
        provider,
        unirepAddress,
        startBlock,
        id,
        commitment,
    )
    const attesterId = BigInt(add0x(args.attester_id))

    // Proving content
    const provePosRep = args.min_pos_rep != null ? BigInt(1) : BigInt(0)
    const proveNegRep = args.max_neg_rep != null ? BigInt(1) : BigInt(0)
    const proveRepDiff = args.min_rep_diff != null ? BigInt(1) : BigInt(0)
    const proveGraffiti = args.graffiti_preimage != null ? BigInt(1) : BigInt(0)
    const minRepDiff = args.min_rep_diff != null ? BigInt(args.min_rep_diff) : BigInt(0)
    const minPosRep = args.min_pos_rep != null ? BigInt(args.min_pos_rep) : BigInt(0)
    const maxNegRep = args.max_neg_rep != null ? BigInt(args.max_neg_rep) : BigInt(0)
    const graffitiPreImage = args.graffiti_preimage != null ? BigInt(add0x(args.graffiti_preimage)) : BigInt(0)


    let circuitInputs: any

    if(args.from_database){

        console.log('generating proving circuit from database...')

        circuitInputs = await genProveReputationFromAttesterCircuitInputsFromDB(
            userState.getUnirepStateCurrentEpoch(), id,attesterId, provePosRep, proveNegRep, proveRepDiff, proveGraffiti, minPosRep, maxNegRep, minRepDiff, graffitiPreImage)

    } else {

        console.log('generating proving circuit from contract...')

        circuitInputs = await userState.genProveReputationFromAttesterCircuitInputs(attesterId, provePosRep, proveNegRep, proveRepDiff, proveGraffiti, minPosRep, maxNegRep, minRepDiff, graffitiPreImage)
    }
    const results = await genVerifyReputationFromAttesterProofAndPublicSignals(stringifyBigInts(circuitInputs))

    // TODO: Not sure if this validation is necessary
    const isValid = await verifyProveReputationFromAttesterProof(results['proof'], results['publicSignals'])
    if(!isValid) {
        console.error('Error: reputation proof generated is not valid!')
        return
    }
    
    const formattedProof = formatProofForVerifierContract(results["proof"])
    const encodedProof = base64url.encode(JSON.stringify(formattedProof))
    console.log(`Proof of reputation from attester ${attesterId}:`)
    console.log(reputationProofFromAttesterPrefix + encodedProof)
}

export {
    genReputationProofFromAttester,
    configureSubparser,
}