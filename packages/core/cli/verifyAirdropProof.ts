import base64url from 'base64url'
import { ethers } from 'ethers'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { formatProofForSnarkjsVerification } from '@unirep/core'
import { UnirepFactory, SignUpProof } from '@unirep/contracts'
import { signUpProofPrefix, signUpPublicSignalsPrefix } from './prefix'
import { UnirepSocialFactory } from '../src/utils'
import { getProvider } from './utils'
import { genUnirepState } from './test/utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('verifyAirdropProof', {
        add_help: true,
    })

    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
    })

    parser.add_argument('-ep', '--epoch', {
        action: 'store',
        type: 'int',
        help: 'The latest epoch user transitioned to. Default: current epoch',
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

const verifyAirdropProof = async (args: any) => {
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
        UnirepFactory.abi,
        provider
    )

    const unirepState = await genUnirepState(provider, unirepContract.address)

    // Parse Inputs
    const decodedProof = base64url.decode(
        args.proof.slice(signUpProofPrefix.length)
    )
    const decodedPublicSignals = base64url.decode(
        args.public_signals.slice(signUpPublicSignalsPrefix.length)
    )
    const publicSignals = JSON.parse(decodedPublicSignals)
    const proof = JSON.parse(decodedProof)
    const signUpProof = new SignUpProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof)
    )
    const GSTRoot = signUpProof.globalStateTree.toString()
    const epoch = Number(signUpProof.epoch)
    const epk = signUpProof.epochKey
    const userHasSignedUp = Number(signUpProof.userHasSignedUp)
    const attesterId = signUpProof.attesterId

    // Check if Global state tree root exists
    const isGSTRootExisted = await unirepState.GSTRootExists(GSTRoot, epoch)
    if (!isGSTRootExisted) {
        console.error('Error: invalid global state tree root')
        return
    }

    // Check if user has sign up flag
    if (Number(userHasSignedUp) === 0) {
        console.log('Error: user does not sign up through Unirep Social')
        return
    }

    // Check if attester is correct
    const unirepSocialId = await unirepContract.attesters(
        unirepSocialContract.address
    )
    if (Number(unirepSocialId) != Number(attesterId)) {
        console.error('Error: wrong attester ID proof')
        return
    }

    // Verify the proof on-chain
    const isProofValid = await unirepContract.verifyUserSignUp(
        signUpProof.publicSignals,
        signUpProof.proof
    )
    if (!isProofValid) {
        console.error('Error: invalid reputation proof')
        return
    }

    console.log(
        `Verify reputation proof of epoch key ${epk.toString()} airdrop proof success`
    )
}

export { verifyAirdropProof, configureSubparser }
