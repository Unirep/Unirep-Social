import base64url from 'base64url'
import { ethers } from 'ethers'
import { unSerialiseIdentity } from '@unirep/crypto'
import * as circuit from '@unirep/circuits'
import { genUserStateFromContract } from '@unirep/unirep'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import {
    identityPrefix,
    signUpProofPrefix,
    signUpPublicSignalsPrefix,
} from './prefix'
import { UnirepSocial, UnirepSocialFacory } from '../core/utils'
import { Unirep } from '@unirep/contracts'
import { getProvider } from './utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('genAirdropProof', { add_help: true })

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

    parser.add_argument('-x', '--contract', {
        required: true,
        type: 'str',
        help: 'The Unirep Social contract address',
    })
}

const genAirdropProof = async (args: any) => {
    // Ethereum provider
    const ethProvider = args.eth_provider
        ? args.eth_provider
        : DEFAULT_ETH_PROVIDER
    const provider = getProvider(ethProvider)

    // Unirep Social contract
    const unirepSocialContract: UnirepSocial = UnirepSocialFacory.connect(
        args.contract,
        provider
    )
    const unirepContractAddr = await unirepSocialContract.unirep()
    const unirepContract = new ethers.Contract(
        unirepContractAddr,
        Unirep.abi,
        provider
    )

    // Gen epoch key proof
    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = unSerialiseIdentity(decodedIdentity)
    const userState = await genUserStateFromContract(
        provider,
        unirepContract.address,
        id
    )
    const attesterId = BigInt(
        await unirepContract.attesters(unirepSocialContract.address)
    )
    const { publicSignals, proof, epoch, epochKey } =
        await userState.genUserSignUpProof(attesterId)

    // TODO: Not sure if this validation is necessary
    const isValid = await circuit.verifyProof(
        circuit.Circuit.proveUserSignUp,
        proof,
        publicSignals
    )
    if (!isValid) {
        console.error('Error: user sign up proof generated is not valid!')
        return
    }

    const formattedProof = circuit.formatProofForVerifierContract(proof)
    const encodedProof = base64url.encode(JSON.stringify(formattedProof))
    const encodedPublicSignals = base64url.encode(JSON.stringify(publicSignals))
    console.log(`Epoch key of epoch ${epoch}: ${epochKey}`)
    console.log(signUpProofPrefix + encodedProof)
    console.log(signUpPublicSignalsPrefix + encodedPublicSignals)
}

export { genAirdropProof, configureSubparser }
