import base64url from 'base64url'
import { ethers } from 'ethers'
import { genIdentityCommitment, unSerialiseIdentity } from '@unirep/crypto'
import { formatProofForVerifierContract, verifyProof } from '@unirep/circuits'
import { genUserStateFromContract } from '@unirep/unirep'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'
import { identityPrefix, reputationProofPrefix, reputationPublicSignalsPrefix } from './prefix'
import { UnirepSocialContract } from '../core/UnirepSocialContract'
import { DEFAULT_COMMENT_KARMA } from '../config/socialMedia'

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
        '-id', '--identity',
        {
            required: true,
            type: 'str',
            help: 'The (serialized) user\'s identity',
        }
    )

    parser.add_argument(
        '-n', '--epoch-key-nonce',
        {
            required: true,
            type: 'int',
            help: 'The epoch key nonce',
        }
    )

    parser.add_argument(
        '-mr', '--min-rep',
        {
            type: 'int',
            help: 'The minimum reputation score the user has',
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

    const privkeyGroup = parser.add_mutually_exclusive_group({ required: true })

    privkeyGroup.add_argument(
        '-dp', '--prompt-for-eth-privkey',
        {
            action: 'store_true',
            help: 'Whether to prompt for the user\'s Ethereum private key and ignore -d / --eth-privkey',
        }
    )

    privkeyGroup.add_argument(
        '-d', '--eth-privkey',
        {
            action: 'store',
            type: 'str',
            help: 'The deployer\'s Ethereum private key',
        }
    )
}

const leaveComment = async (args: any) => {

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER
    const provider = new ethers.providers.JsonRpcProvider(ethProvider)

    // Unirep Social contract
    const unirepSocialContract = new UnirepSocialContract(args.contract, ethProvider)
    // Unirep contract
    const unirepContract = await unirepSocialContract.getUnirep()
    
    const startBlock = (args.start_block) ? args.start_block : DEFAULT_START_BLOCK

    // Validate epoch key nonce
    const epkNonce = args.epoch_key_nonce
    const numEpochKeyNoncePerEpoch = await unirepContract.numEpochKeyNoncePerEpoch()
    if (epkNonce >= numEpochKeyNoncePerEpoch) {
        console.error('Error: epoch key nonce must be less than max epoch key nonce')
        return
    }

    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = unSerialiseIdentity(decodedIdentity)
    const commitment = genIdentityCommitment(id)
    
    // gen reputation proof 
    const attesterId = await unirepSocialContract.attesterId()
    const proveReputationAmount = DEFAULT_COMMENT_KARMA
    const minRep = args.min_rep != null ? args.min_rep : 0

    let results

    if (args.from_database){

        console.log('generating proving circuit from database...')
        
        // Gen epoch key proof and reputation proof from database
        // circuitInputs = await genProveReputationCircuitInputsFromDB(
        //    currentEpoch,
        //    id,
        //    epkNonce,                       // generate epoch key from epoch nonce
        //    proveKarmaAmount,               // the amount of output karma nullifiers
        //    minRep                          // the amount of minimum reputation the user wants to prove
        // )

        // const db = await mongoose.connect(
        //     dbUri, 
        //     { useNewUrlParser: true, 
        //       useFindAndModify: false, 
        //       useUnifiedTopology: true
        //     }
        // )
        // GSTRoot = (await genGSTreeFromDB(currentEpoch)).root
        // nullifierTreeRoot = (await genNullifierTreeFromDB()).getRootHash()
        // db.disconnect();

    } else {

        console.log('generating proving circuit from contract...')

        const proveGraffiti = 0
        const graffitiPreImage = 0
        const userState = await genUserStateFromContract(
            provider,
            unirepContract.address,
            startBlock,
            id,
            commitment,
        )
        results = await userState.genProveReputationProof(BigInt(attesterId), proveReputationAmount, epkNonce, minRep, proveGraffiti, graffitiPreImage)
    }

    const isValid = await verifyProof('proveReputation', results.proof, results.publicSignals)
    if(!isValid) {
        console.error('Error: reputation proof generated is not valid!')
        return
    }

    if(args.min_rep != null){
        console.log(`Prove minimum reputation: ${minRep}`)
    }

    // Connect a signer
    await unirepSocialContract.unlock(args.eth_privkey)
    // Submit tx
    const txResult = await unirepSocialContract.leaveComment(results, args.post_id, args.text)

    // TODO: Unirep Social should verify if the reputation proof submitted before
    
    const formattedProof = formatProofForVerifierContract(results.proof)
    const encodedProof = base64url.encode(JSON.stringify(formattedProof))
    const encodedPublicSignals = base64url.encode(JSON.stringify(results.publicSignals))
    console.log(`Epoch key of epoch ${results.epoch} and nonce ${epkNonce}: ${results.epochKey}`)
    console.log(reputationProofPrefix + encodedProof)
    console.log(reputationPublicSignalsPrefix + encodedPublicSignals)
    console.log('Transaction hash:', txResult?.tx?.hash)
    process.exit(0)
}

export {
    leaveComment,
    configureSubparser,
}
