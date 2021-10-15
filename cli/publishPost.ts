import base64url from 'base64url'
import { add0x } from '@unirep/crypto'
import { maxReputationBudget } from '@unirep/unirep'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { reputationProofPrefix, reputationPublicSignalsPrefix } from './prefix'
import { UnirepSocialContract } from '../core/UnirepSocialContract'
import { defaultPostReputation } from '../config/socialMedia'
import { verifyReputationProof } from './verifyReputationProof'
import Post, { IPost } from "../database/models/post";

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'publishPost',
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
        '-tx', '--text',
        {
            required: true,
            type: 'str',
            help: 'The text written in the post',
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

const publishPost = async (args: any) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER

    // Unirep Social contract
    const unirepSocialContract = new UnirepSocialContract(args.contract, ethProvider)

    // Parse Inputs
    const decodedProof = base64url.decode(args.proof.slice(reputationProofPrefix.length))
    const decodedPublicSignals = base64url.decode(args.public_signals.slice(reputationPublicSignalsPrefix.length))
    const publicSignals = JSON.parse(decodedPublicSignals)
    const proof = JSON.parse(decodedProof)
    const epoch = publicSignals[maxReputationBudget]
    const epochKey = publicSignals[maxReputationBudget + 1]
    const repNullifiersAmount = publicSignals[maxReputationBudget + 4]
    const minRep = publicSignals[maxReputationBudget + 5]

    if(args.min_rep != null){
        console.log(`Prove minimum reputation: ${minRep}`)
    }

    if(repNullifiersAmount != defaultPostReputation) {
        console.error(`Error: wrong post amount, expect ${defaultPostReputation}`)
        return
    }

    // Verify reputation proof
    await verifyReputationProof(args)

    // Connect a signer
    await unirepSocialContract.unlock(args.eth_privkey)

    // construct a post
    const newpost: IPost = new Post({
        content: args.text,
        // TODO: hashedContent
        epochKey: epochKey,
        epkProof: proof.map((n)=>add0x(BigInt(n).toString(16))),
        proveMinRep: minRep != null ? true : false,
        minRep: Number(minRep),
        comments: [],
        status: 0
    });
    const postId = newpost._id.toString()

    // Submit tx
    const txResult = await unirepSocialContract.publishPost(postId, publicSignals, proof, args.text)

    console.log('Post ID:', postId)
    console.log(`Epoch key of epoch ${epoch}: ${epochKey}`)
    const proofIndex = await unirepSocialContract.getReputationProofIndex(publicSignals, proof)
    if(txResult.tx != undefined){
        console.log('Transaction hash:', txResult.tx?.hash)
        console.log('Proof index:', proofIndex.toNumber())
    }
    process.exit(0)
}

export {
    publishPost,
    configureSubparser,
}