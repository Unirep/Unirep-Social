import base64url from 'base64url'
import { crypto, circuits, core, contracts } from 'unirep'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import {
    epkProofPrefix,
    epkPublicSignalsPrefix,
    identityPrefix,
} from './prefix'
import { UnirepSocialFactory } from '../core/utils'
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
    const unirepContract = contracts.UnirepFactory.connect(
        unirepContractAddr,
        provider
    )

    // Validate epoch key nonce
    const epkNonce = args.epoch_key_nonce
    const numEpochKeyNoncePerEpoch =
        await unirepContract.numEpochKeyNoncePerEpoch()
    if (epkNonce >= numEpochKeyNoncePerEpoch) {
        console.error(
            'Error: epoch key nonce must be less than max epoch key nonce'
        )
        return
    }

    // Gen epoch key proof
    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = new crypto.ZkIdentity(
        crypto.Strategy.SERIALIZED,
        decodedIdentity
    )
    const userState = await core.genUserStateFromContract(
        provider,
        unirepContract.address,
        id
    )
    const { publicSignals, proof, epoch, epochKey } =
        await userState.genVerifyEpochKeyProof(epkNonce)

    // TODO: Not sure if this validation is necessary
    const isValid = await circuits.verifyProof(
        circuits.Circuit.verifyEpochKey,
        proof,
        publicSignals
    )
    if (!isValid) {
        console.error('Error: epoch key proof generated is not valid!')
        return
    }

    const formattedProof = circuits.formatProofForVerifierContract(proof)
    const encodedProof = base64url.encode(JSON.stringify(formattedProof))
    const encodedPublicSignals = base64url.encode(JSON.stringify(publicSignals))
    console.log(
        `Epoch key of epoch ${epoch} and nonce ${epkNonce}: ${epochKey}`
    )
    console.log(epkProofPrefix + encodedProof)
    console.log(epkPublicSignalsPrefix + encodedPublicSignals)
}

export { genEpochKeyAndProof, configureSubparser }
