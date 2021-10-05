import base64url from 'base64url'
import { ethers } from 'ethers'
import { genIdentityCommitment, unSerialiseIdentity } from '@unirep/crypto'
import { formatProofForVerifierContract, verifyProof } from '@unirep/circuits'
import { genUserStateFromContract } from '@unirep/unirep'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'
import { identityPrefix, reputationProofPrefix, reputationPublicSignalsPrefix } from './prefix'
import { UnirepSocialContract } from '../core/UnirepSocialContract'

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
            help: 'The minimum reputation score the attester has',
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

const vote = async (args: any) => {
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

    // upvote / downvote user 
    const upvoteValue = args.upvote_value != null ? args.upvote_value : 0
    const downvoteValue = args.downvote_value != null ? args.downvote_value : 0
    const voteValue = upvoteValue + downvoteValue

    // Validate epoch key nonce
    // const epkNonce = args.epoch_key_nonce
    // const numEpochKeyNoncePerEpoch = await unirepContract.numEpochKeyNoncePerEpoch()
    // if (epkNonce >= numEpochKeyNoncePerEpoch) {
    //     console.error('Error: epoch key nonce must be less than max epoch key nonce')
    //     return
    // }
    // const encodedIdentity = args.identity.slice(identityPrefix.length)
    // const decodedIdentity = base64url.decode(encodedIdentity)
    // const id = unSerialiseIdentity(decodedIdentity)
    // const commitment = genIdentityCommitment(id)
    // const currentEpoch = (await unirepContract.currentEpoch()).toNumber()
    // const treeDepths = await unirepContract.treeDepths()
    // const epochTreeDepth = treeDepths.epochTreeDepth
    // const epk = genEpochKey(id.identityNullifier, currentEpoch, epkNonce, epochTreeDepth)

    // gen nullifier nonce list
    const attesterId = await unirepSocialContract.attesterId()
    const proveReputationAmount = voteValue
    const minRep = args.min_rep != null ? args.min_rep : 0
    
    // let circuitInputs: any
    // let GSTRoot: any
    // let nullifierTreeRoot: any
    let results

    if(args.from_database){

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
    
    // const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
    // const nullifiers = results['publicSignals'].slice(0, MAX_KARMA_BUDGET)

    // TODO: Not sure if this validation is necessary
    const isValid = await verifyProof('proveReputation', results.proof, results.publicSignals)
    if(!isValid) {
        console.error('Error: reputation proof generated is not valid!')
        return
    }

    // const proof = formatProofForVerifierContract(results['proof'])
    // const fromEpochKey = epk
    // const encodedProof = base64url.encode(JSON.stringify(proof))

    // generate public signals
    // const publicSignals = [
    //     GSTRoot,
    //     nullifierTreeRoot,
    //     BigInt(true),
    //     proveKarmaAmount,
    //     args.min_rep != null ? BigInt(1) : BigInt(0),
    //     args.min_rep != null ? BigInt(args.min_rep) : BigInt(0)
    // ]

    if(args.min_rep != null){
        console.log(`Prove minimum reputation: ${minRep}`)
    }

    // upvote or downvote to epoch key
    // const attestationToEpochKey = new Attestation(
    //     BigInt(attesterId),
    //     BigInt(upvoteValue),
    //     BigInt(downvoteValue),
    //     graffiti,
    //     overwriteGraffiti,
    // )

    // Sign the message
    // const message = ethers.utils.solidityKeccak256(["address", "address"], [wallet.address, unirepAddress])
    // const attesterSig = await wallet.signMessage(ethers.utils.arrayify(message))

    // set vote fee
    // const voteFee = attestingFee.mul(2)

    console.log(`Attesting to epoch key ${args.epoch_key} with pos rep ${upvoteValue}, neg rep ${downvoteValue}`)
    // let tx
    // try {
    //     tx = await unirepSocialContract.vote(
    //         attesterSig,
    //         attestationToEpochKey,
    //         BigInt(add0x(args.epoch_key)),
    //         fromEpochKey,
    //         nullifiers,
    //         publicSignals,
    //         proof,
    //         { value: voteFee, gasLimit: 3000000 }
    //     )
    // } catch(e) {
    //     console.error('Error: the transaction failed')
    //     if (e.message) {
    //         console.error(e.message)
    //     }
    //     return
    // }
    // Connect a signer
    await unirepSocialContract.unlock(args.eth_privkey)
    // Submit tx
    const tx = await unirepSocialContract.vote(results, args.epoch_key, upvoteValue, downvoteValue)

    // TODO: Unirep Social should verify if the reputation proof submitted before

    const formattedProof = formatProofForVerifierContract(results.proof)
    const encodedProof = base64url.encode(JSON.stringify(formattedProof))
    const encodedPublicSignals = base64url.encode(JSON.stringify(results.publicSignals))
    console.log(`Epoch key of epoch ${results.epoch} and nonce ${epkNonce}: ${results.epochKey}`)
    console.log(reputationProofPrefix + encodedProof)
    console.log(reputationPublicSignalsPrefix + encodedPublicSignals)
    console.log('Transaction hash:', tx?.hash)
    process.exit(0)
}

export {
    vote,
    configureSubparser,
}