import base64url from 'base64url'
import { ethers } from 'ethers'
import { genUserState } from './test/utils'
import { ZkIdentity } from '@unirep/crypto'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import {
    epkProofPrefix,
    epkPublicSignalsPrefix,
    identityPrefix,
} from './prefix'
import { UnirepSocialFactory } from '../src/utils'
import { UnirepFactory } from '@unirep/contracts'
import { getProvider } from './utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('genEpochKeyAndProof', {
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

    parser.add_argument('-b', '--start-block', {
        action: 'store',
        type: 'int',
        help: 'The block the Unirep contract is deployed. Default: 0',
    })

    parser.add_argument('-x', '--contract', {
        required: true,
        type: 'str',
        help: 'The Unirep Social contract address',
    })
}

const genEpochKeyAndProof = async (args: any) => {
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

    // Gen epoch key proof
    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = new ZkIdentity(2, decodedIdentity)
    const userState = await genUserState(
        provider,
        unirepContract.address,
        id as any // TODO
    )
    const formattedProof = await userState.genVerifyEpochKeyProof(epkNonce)

    // TODO: Not sure if this validation is necessary
    const isValid = await formattedProof.verify()
    if (!isValid) {
        console.error('Error: epoch key proof generated is not valid!')
        return
    }

    // const formattedProof = circuit.formatProofForVerifierContract(proof)
    const encodedProof = base64url.encode(JSON.stringify(formattedProof.proof))
    const encodedPublicSignals = base64url.encode(
        JSON.stringify(formattedProof.publicSignals)
    )
    console.log(
        `Epoch key of epoch ${formattedProof.epoch} and nonce ${epkNonce}: ${formattedProof.epochKey}`
    )
    console.log(epkProofPrefix + encodedProof)
    console.log(epkPublicSignalsPrefix + encodedPublicSignals)
}

export { genEpochKeyAndProof, configureSubparser }
