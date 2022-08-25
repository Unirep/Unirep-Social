import base64url from 'base64url'
import { ethers } from 'ethers'
import { add0x } from './utils'
import {
    formatProofForVerifierContract,
    MAX_REPUTATION_BUDGET,
} from '@unirep/circuits'
import { genReputationNullifier } from '@unirep/core'
import { genUserState } from './test/utils'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import {
    identityPrefix,
    reputationProofPrefix,
    reputationPublicSignalsPrefix,
} from './prefix'
import {
    defaultCommentReputation,
    defaultPostReputation,
} from '../config/socialMedia'
import { ReputationProof, UnirepFactory } from '@unirep/contracts'
import { UnirepSocialFactory } from '../src/utils'
import { getProvider } from './utils'
import { ZkIdentity } from '@unirep/crypto'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('genReputationProof', {
        add_help: true,
    })

    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
    })

    parser.add_argument('-id', '--identity', {
        required: true,
        type: 'str',
        help: "The (serialized) user's identity",
    })

    parser.add_argument('-n', '--epoch-key-nonce', {
        required: true,
        type: 'int',
        help: 'The epoch key nonce',
    })

    parser.add_argument('-r', '--reputation-nullifier', {
        type: 'int',
        help: 'The number of reputation nullifiers to prove',
    })

    parser.add_argument('-act', '--action', {
        type: 'str',
        help: 'The act that the user wants to perform. Actions: post | comment | vote. If user chooses to vote, then the user should provide the vote value.',
    })

    parser.add_argument('-v', '--vote-value', {
        type: 'int',
        help: `The vote value the user wants to give, at least 1, at most ${MAX_REPUTATION_BUDGET}`,
    })

    parser.add_argument('-mr', '--min-rep', {
        type: 'int',
        help: 'The minimum reputation score the user has',
    })

    parser.add_argument('-gp', '--graffiti-preimage', {
        type: 'str',
        help: 'The pre-image of the graffiti for the reputation the attester given to the user (in hex representation)',
    })

    parser.add_argument('-x', '--contract', {
        required: true,
        type: 'str',
        help: 'The Unirep Social contract address',
    })
}

const genReputationProof = async (args: any) => {
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
    const unirepContract = new ethers.Contract(
        unirepContractAddr,
        UnirepFactory.abi,
        provider
    )

    // Validate epoch key nonce
    const epkNonce = args.epoch_key_nonce
    const { numEpochKeyNoncePerEpoch } = await unirepContract.config()
    if (epkNonce >= numEpochKeyNoncePerEpoch) {
        console.error(
            'Error: epoch key nonce must be less than max epoch key nonce'
        )
        return
    }
    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = new ZkIdentity(2, decodedIdentity)

    // gen reputation proof
    let proveReputationAmount
    if (args.action == 'post') {
        proveReputationAmount = defaultPostReputation
    } else if (args.action == 'comment') {
        proveReputationAmount = defaultCommentReputation
    } else if (args.action == 'vote') {
        if (args.vote_value == undefined) {
            console.error('Error: should provide a vote value')
            return
        } else if (
            args.vote_value > MAX_REPUTATION_BUDGET ||
            args.vote_value < 1
        ) {
            console.error(
                `Error: should provide a valid vote value, min: 1, max: ${MAX_REPUTATION_BUDGET}`
            )
            return
        }
        proveReputationAmount = args.vote_value
    } else if (args.reputation_nullifier != null) {
        proveReputationAmount =
            args.reputation_nullifier != null ? args.reputation_nullifier : 0
    } else {
        proveReputationAmount = 0
    }
    const attesterId = BigInt(
        await unirepContract.attesters(unirepSocialContract.address)
    )
    const proveGraffiti = args.graffiti_preimage != null ? BigInt(1) : BigInt(0)
    const minRep = args.min_rep != null ? args.min_rep : 0
    const graffitiPreImage =
        args.graffiti_preimage != null
            ? BigInt(add0x(args.graffiti_preimage))
            : BigInt(0)

    const userState = await genUserState(
        provider,
        unirepContract.address,
        id as any // TODO
    )
    const nonceList: BigInt[] = []
    const rep = await userState.getRepByAttester(attesterId)
    const epoch = await userState.getUnirepStateCurrentEpoch()
    const reputationProof = await userState.genProveReputationProof(
        attesterId,
        epkNonce,
        minRep,
        proveGraffiti,
        graffitiPreImage,
        proveReputationAmount
    )

    // TODO: Not sure if this validation is necessary
    const isValid = await reputationProof.verify()
    if (!isValid) {
        console.error('Error: reputation proof generated is not valid!')
        return
    }

    if (args.min_rep != null) {
        console.log(`Prove minimum reputation: ${minRep}`)
    }

    const encodedProof = base64url.encode(JSON.stringify(reputationProof.proof))
    const encodedPublicSignals = base64url.encode(
        JSON.stringify(reputationProof.publicSignals)
    )
    console.log(
        `Epoch key of epoch ${epoch} and nonce ${epkNonce}: ${reputationProof.epochKey}`
    )
    console.log(reputationProofPrefix + encodedProof)
    console.log(reputationPublicSignalsPrefix + encodedPublicSignals)
}

export { genReputationProof, configureSubparser }
