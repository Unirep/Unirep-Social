import base64url from 'base64url'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { reputationProofPrefix, reputationPublicSignalsPrefix } from './prefix'
import { UnirepSocialContract } from '../core/UnirepSocialContract'
import { defaultCommentReputation } from '../config/socialMedia'
import { verifyReputationProof } from './verifyReputationProof'
import { ReputationProof } from '@unirep/contracts'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'leaveComment',
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
            help: 'The text written in the comment',
        }
    )

    parser.add_argument(
        '-pid', '--post-id',
        {
            required: true,
            type: 'str',
            help: 'The post id where the comment replies to (in decimal representation)',
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
        '-d', '--eth-privkey',
        {
            required: true,
            action: 'store',
            type: 'str',
            help: 'The deployer\'s Ethereum private key',
        }
    )
}

const leaveComment = async (args: any) => {

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

    if(args.min_rep != null){
        console.log(`Prove minimum reputation: ${minRep}`)
    }

    if(repNullifiersAmount != defaultCommentReputation) {
        console.error(`Error: wrong comment amount, expect ${defaultCommentReputation}`)
        return
    }

     // Verify reputation proof
     await verifyReputationProof(args)

    // Connect a signer
    await unirepSocialContract.unlock(args.eth_privkey)

    // Submit tx
    let tx
    try {
        tx = await unirepSocialContract.leaveComment(reputationProof, args.post_id, args.text)
    } catch (error) {
        console.log('Transaction Error', error)
        return
    }

    // TODO: Unirep Social should verify if the reputation proof submitted before
    console.log(`Epoch key of epoch ${epoch}: ${epochKey}`)
    await tx.wait()
    const proofIndex = await unirepSocialContract.getReputationProofIndex(reputationProof)
    console.log('Transaction hash:', tx?.hash)
    console.log('Proof index:', proofIndex.toNumber())
}

export {
    leaveComment,
    configureSubparser,
}
