import base64url from 'base64url'
import { ethers } from 'ethers'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'
import { Unirep } from '@unirep/contracts'

import { DEFAULT_ETH_PROVIDER, DEFAULT_PRIVATE_KEY } from './defaults'
import { reputationProofPrefix, reputationPublicSignalsPrefix } from './prefix'
import { defaultCommentReputation } from '../config/socialMedia'
import { verifyReputationProof } from './verifyReputationProof'
import { UnirepSocialFactory } from '../core/utils'
import { getProvider } from './utils'

// TODO: use export package from '@unirep/unirep'
import { ReputationProof } from '../test/utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('leaveComment', { add_help: true })

    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
    })

    parser.add_argument('-tx', '--text', {
        required: true,
        type: 'str',
        help: 'The text written in the comment',
    })

    parser.add_argument('-pid', '--post-id', {
        required: true,
        type: 'str',
        help: 'The post id where the comment replies to (in decimal representation)',
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

    parser.add_argument('-x', '--contract', {
        required: true,
        type: 'str',
        help: 'The Unirep Social contract address',
    })

    parser.add_argument('-d', '--eth-privkey', {
        action: 'store',
        type: 'str',
        help: "The deployer's Ethereum private key. Default: set in the `.env` file",
    })
}

const leaveComment = async (args: any) => {
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
        Unirep.abi,
        provider
    )
    const attestingFee = await unirepContract.attestingFee()

    // Parse Inputs
    const decodedProof = base64url.decode(
        args.proof.slice(reputationProofPrefix.length)
    )
    const decodedPublicSignals = base64url.decode(
        args.public_signals.slice(reputationPublicSignalsPrefix.length)
    )
    const publicSignals = JSON.parse(decodedPublicSignals)
    const proof = JSON.parse(decodedProof)
    const reputationProof = new ReputationProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof)
    )
    const epoch = reputationProof.epoch
    const epochKey = reputationProof.epochKey
    const repNullifiersAmount = reputationProof.proveReputationAmount
    const minRep = reputationProof.minRep

    if (args.min_rep != null) {
        console.log(`Prove minimum reputation: ${minRep}`)
    }

    if (repNullifiersAmount != defaultCommentReputation) {
        console.error(
            `Error: wrong comment amount, expect ${defaultCommentReputation}`
        )
        return
    }

    // Verify reputation proof
    await verifyReputationProof(args)

    // Connect a signer
    const privKey = args.eth_privkey ? args.eth_privkey : DEFAULT_PRIVATE_KEY
    const wallet = new ethers.Wallet(privKey, provider)

    // Submit tx
    let tx
    try {
        tx = await unirepSocialContract
            .connect(wallet)
            .leaveComment(args.post_id, args.text, reputationProof, {
                value: attestingFee,
            })
    } catch (error) {
        console.log('Transaction Error', error)
        return
    }

    // TODO: Unirep Social should verify if the reputation proof submitted before
    console.log(`Epoch key of epoch ${epoch}: ${epochKey}`)
    await tx.wait()
    const proofIndex = await unirepContract.getProofIndex(
        reputationProof.hash()
    )
    console.log('Transaction hash:', tx?.hash)
    console.log('Proof index:', proofIndex.toNumber())
}

export { leaveComment, configureSubparser }
