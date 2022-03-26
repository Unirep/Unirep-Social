import base64url from 'base64url'
import { ethers } from 'ethers'
import { genUnirepStateFromContract } from '@unirep/unirep'
import { Unirep } from '@unirep/contracts'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { epkProofPrefix, epkPublicSignalsPrefix } from './prefix'
import { UnirepSocialFactory } from '../core/utils'
import { getProvider } from './utils'

// TODO: use export package from '@unirep/unirep'
import { EpochKeyProof } from '../test/utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('verifyEpochKeyProof', {
        add_help: true,
    })

    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
    })

    parser.add_argument('-p', '--public-signals', {
        required: true,
        type: 'str',
        help: "The snark public signals of the user's epoch key ",
    })

    parser.add_argument('-pf', '--proof', {
        required: true,
        type: 'str',
        help: "The snark proof of the user's epoch key ",
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

const verifyEpochKeyProof = async (args: any) => {
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
    // Unirep contract
    const unirepContractAddr = await unirepSocialContract.unirep()
    const unirepContract = new ethers.Contract(
        unirepContractAddr,
        Unirep.abi,
        provider
    )

    const unirepState = await genUnirepStateFromContract(
        provider,
        unirepContract.address
    )

    const decodedProof = base64url.decode(
        args.proof.slice(epkProofPrefix.length)
    )
    const decodedPublicSignals = base64url.decode(
        args.public_signals.slice(epkPublicSignalsPrefix.length)
    )
    const proof = JSON.parse(decodedProof)
    const publicSignals = JSON.parse(decodedPublicSignals)
    const epochKeyProof = new EpochKeyProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof)
    )
    const currentEpoch = unirepState.currentEpoch
    const epk = epochKeyProof.epochKey
    const inputEpoch = Number(epochKeyProof.epoch)
    const GSTRoot = epochKeyProof.globalStateTree.toString()
    console.log(
        `Verifying epoch key ${epk} with GSTRoot ${GSTRoot} in epoch ${inputEpoch}`
    )
    if (inputEpoch != currentEpoch) {
        console.log(
            `Warning: the epoch key is expired. Epoch key is in epoch ${inputEpoch}, but the current epoch is ${currentEpoch}`
        )
    }

    // Check if Global state tree root exists
    const isGSTRootExisted = unirepState.GSTRootExists(GSTRoot, inputEpoch)
    if (!isGSTRootExisted) {
        console.error('Error: invalid global state tree root')
        return
    }

    // Verify the proof on-chain
    const isProofValid = await unirepContract.verifyEpochKeyValidity(
        epochKeyProof
    )
    if (!isProofValid) {
        console.error('Error: invalid epoch key proof')
        return
    }
    console.log(`Verify epoch key proof with epoch key ${epk} succeed`)
}

export { verifyEpochKeyProof, configureSubparser }
