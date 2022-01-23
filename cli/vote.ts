import base64url from 'base64url'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'
import { ReputationProof } from '@unirep/contracts'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { reputationProofPrefix, reputationPublicSignalsPrefix } from './prefix'
import { UnirepSocialContract } from '../core/UnirepSocialContract'
import { verifyReputationProof } from './verifyReputationProof'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'vote',
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
        '-epk', '--epoch-key',
        {
            required: true,
            type: 'str',
            help: 'The user\'s epoch key to attest to (in hex representation)',
        }
    )

    parser.add_argument(
        '-i', '--proof-index',
        {
            required: true,
            type: 'int',
            help: 'The proof index of the user\'s epoch key ',
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
        '-uv', '--upvote-value',
        {
            type: 'int',
            help: 'Score of positive reputation to give to the user and substract from attester\'s epoch key',
        }
    )

    parser.add_argument(
        '-dv', '--downvote-value',
        {
            type: 'int',
            help: 'Score of negative reputation to give to the user and substract from attester\'s epoch key',
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
        '-d', '--eth-privkey',
        {
            required: true,
            action: 'store',
            type: 'str',
            help: 'The deployer\'s Ethereum private key',
        }
    )
}

const vote = async (args: any) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER

    // Unirep Social contract
    const unirepSocialContract = new UnirepSocialContract(args.contract, ethProvider)

    // Parse Inputs
    const decodedProof = base64url.decode(args.proof.slice(reputationProofPrefix.length))
    const decodedPublicSignals = base64url.decode(args.public_signals.slice(reputationPublicSignalsPrefix.length))
    const publicSignals = JSON.parse(decodedPublicSignals)
    const proof = JSON.parse(decodedProof)
    const reputationProof = new ReputationProof(publicSignals, formatProofForSnarkjsVerification(proof))
    const epoch = reputationProof.epoch
    const epochKey = reputationProof.epochKey
    const repNullifiersAmount = reputationProof.proveReputationAmount
    const minRep = reputationProof.minRep

    // upvote / downvote user
    const upvoteValue = args.upvote_value != null ? args.upvote_value : 0
    const downvoteValue = args.downvote_value != null ? args.downvote_value : 0
    const voteValue = upvoteValue + downvoteValue

    if(args.min_rep != null){
        console.log(`Prove minimum reputation: ${minRep}`)
    }

    if(repNullifiersAmount != voteValue) {
        console.error(`Error: wrong vote amount, expect ${voteValue}`)
        return
    }

    // Verify reputation proof
    await verifyReputationProof(args)

    console.log(`Attesting to epoch key ${args.epoch_key} with pos rep ${upvoteValue}, neg rep ${downvoteValue}`)
    // Connect a signer
    await unirepSocialContract.unlock(args.eth_privkey)
    // Submit tx
    let tx
    try {
        tx = await unirepSocialContract.vote(
            reputationProof, 
            args.epoch_key, 
            args.proof_index, 
            upvoteValue, 
            downvoteValue
        )
    } catch (error) {
        console.log('Transaction Error', error)
        return
    }

    console.log(`Epoch key of epoch ${epoch}: ${epochKey}`)
    await tx.wait()
    const proofIndex = await unirepSocialContract.getReputationProofIndex(reputationProof)
    console.log('Transaction hash:', tx?.hash)
    console.log('Proof index:', proofIndex.toNumber())
}

export {
    vote,
    configureSubparser,
}