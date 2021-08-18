import base64url from 'base64url'
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { genIdentityCommitment, unSerialiseIdentity } from 'libsemaphore'
import { stringifyBigInts } from 'maci-crypto'
import mongoose from 'mongoose'

import {
    promptPwd,
    validateEthSk,
    validateEthAddress,
    checkDeployerProviderConnection,
    contractExists,
} from './utils'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'
import { dbUri } from '../config/database';

import { add0x } from '../crypto/SMT'
import { genUserStateFromContract } from '../core'

import Unirep from "../artifacts/contracts/Unirep.sol/Unirep.json"
import UnirepSocial from "../artifacts/contracts/UnirepSocial.sol/UnirepSocial.json"
import { identityPrefix, reputationProofPrefix } from './prefix'

import Post, { IPost } from "../database/models/post";
import { DEFAULT_POST_KARMA, MAX_KARMA_BUDGET } from '../config/socialMedia'
import { formatProofForVerifierContract, genVerifyReputationProofAndPublicSignals, verifyProveReputationProof } from '../circuits/utils'
import { genEpochKey } from '../core/utils'
import { genGSTreeFromDB, genNullifierTreeFromDB, genProveReputationCircuitInputsFromDB } from '../database/utils'

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

const publishPost = async (args: any) => {

    // Unirep Social contract
    if (!validateEthAddress(args.contract)) {
        console.error('Error: invalid contract address')
        return
    }

    const unirepSocialAddress = args.contract

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER

    let ethSk
    // The deployer's Ethereum private key
    // The user may either enter it as a command-line option or via the
    // standard input
    if (args.prompt_for_eth_privkey) {
        ethSk = await promptPwd('Your Ethereum private key')
    } else {
        ethSk = args.eth_privkey
    }

    if (!validateEthSk(ethSk)) {
        console.error('Error: invalid Ethereum private key')
        return
    }

    if (! (await checkDeployerProviderConnection(ethSk, ethProvider))) {
        console.error('Error: unable to connect to the Ethereum provider at', ethProvider)
        return
    }

    const provider = new hardhatEthers.providers.JsonRpcProvider(ethProvider)
    const wallet = new ethers.Wallet(ethSk, provider)

    if (! await contractExists(provider, unirepSocialAddress)) {
        console.error('Error: there is no contract deployed at the specified address')
        return
    }

    const startBlock = (args.start_block) ? args.start_block : DEFAULT_START_BLOCK
    const unirepSocialContract = new ethers.Contract(
        unirepSocialAddress,
        UnirepSocial.abi,
        wallet,
    )

    const unirepAddress = await unirepSocialContract.unirep()

    const unirepContract = new ethers.Contract(
        unirepAddress,
        Unirep.abi,
        provider,
    )
    const attestingFee = await unirepContract.attestingFee()
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
    const currentEpoch = (await unirepContract.currentEpoch()).toNumber()
    const treeDepths = await unirepContract.treeDepths()
    const epochTreeDepth = treeDepths.epochTreeDepth
    const epk = genEpochKey(id.identityNullifier, currentEpoch, epkNonce, epochTreeDepth).toString(16)

    // gen reputation proof 
    const proveKarmaAmount = DEFAULT_POST_KARMA
    const minRep = args.min_rep != null ? args.min_rep : 0

    let circuitInputs: any
    let GSTRoot: any
    let nullifierTreeRoot: any

    if(args.from_database){

        console.log('generating proving circuit from database...')
        
         // Gen epoch key proof and reputation proof from database
        circuitInputs = await genProveReputationCircuitInputsFromDB(
            currentEpoch,
            id,
            epkNonce,                       // generate epoch key from epoch nonce
            proveKarmaAmount,               // the amount of output karma nullifiers
            minRep                          // the amount of minimum reputation the user wants to prove
        )
        
        const db = await mongoose.connect(
            dbUri, 
            { useNewUrlParser: true, 
              useFindAndModify: false, 
              useUnifiedTopology: true
            }
        )
        GSTRoot = (await genGSTreeFromDB(currentEpoch)).root
        nullifierTreeRoot = (await genNullifierTreeFromDB()).getRootHash()
        db.disconnect();

    } else {

        console.log('generating proving circuit from contract...')

        // Gen epoch key proof and reputation proof from Unirep contract
        const userState = await genUserStateFromContract(
            provider,
            unirepAddress,
            startBlock,
            id,
            commitment,
        )

        circuitInputs = await userState.genProveReputationCircuitInputs(
            epkNonce,                       // generate epoch key from epoch nonce
            proveKarmaAmount,               // the amount of output karma nullifiers
            minRep                          // the amount of minimum reputation the user wants to prove
        )
        
        GSTRoot = userState.getUnirepStateGSTree(currentEpoch).root
        nullifierTreeRoot = (await userState.getUnirepStateNullifierTree()).getRootHash()
    }

    const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
    const nullifiers = results['publicSignals'].slice(0, MAX_KARMA_BUDGET)
    
    // TODO: Not sure if this validation is necessary
    const isValid = await verifyProveReputationProof(results['proof'], results['publicSignals'])
    if(!isValid) {
        console.error('Error: reputation proof generated is not valid!')
        return
    }

    const proof = formatProofForVerifierContract(results['proof'])
    const epochKey = BigInt(add0x(epk))
    const encodedProof = base64url.encode(JSON.stringify(proof))

    // generate public signals
    const publicSignals = [
        GSTRoot,
        nullifierTreeRoot,
        BigInt(true),
        DEFAULT_POST_KARMA,
        args.min_rep != null ? BigInt(1) : BigInt(0),
        args.min_rep != null ? BigInt(args.min_rep) : BigInt(0)
    ]
    
    if(args.min_rep != null){
        console.log(`Prove minimum reputation: ${minRep}`)
    }
    
    const newpost: IPost = new Post({
        content: args.text,
        // TODO: hashedContent
        epochKey: epk,
        epkProof: proof.map((n)=>add0x(BigInt(n).toString(16))),
        proveMinRep: args.min_rep != null ? true : false,
        minRep: Number(minRep),
        comments: [],
        status: 0
    });

    if (args.from_database){
        const db = await mongoose.connect(
            dbUri, 
            { useNewUrlParser: true, 
              useFindAndModify: false, 
              useUnifiedTopology: true
            }
        )
        await newpost.save()
        db.disconnect();
    }

    let tx
    try {
        tx = await unirepSocialContract.publishPost(
            BigInt(add0x(newpost._id.toString())), 
            epochKey,
            args.text, 
            nullifiers,
            publicSignals, 
            proof,
            { value: attestingFee, gasLimit: 1000000 }
        )
    } catch(e) {
        console.error('Error: the transaction failed')
        if (e.message) {
            console.error(e.message)
        }

        if (args.from_database){
            const db = await mongoose.connect(
                dbUri, 
                { useNewUrlParser: true, 
                  useFindAndModify: false, 
                  useUnifiedTopology: true
                }
            )
            const res = await Post.deleteOne({_id: newpost._id})
            console.log(res)
            db.disconnect();
        }
        return
    }
    
    console.log('Post ID:', newpost._id.toString())
    console.log(`Epoch key of epoch ${currentEpoch} and nonce ${epkNonce}: ${epk}`)
    console.log(reputationProofPrefix + encodedProof)
    console.log('Transaction hash:', tx.hash)
    process.exit(0)
}

export {
    publishPost,
    configureSubparser,
}