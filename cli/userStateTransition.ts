import base64url from 'base64url'
import { ethers } from 'ethers'
import { genIdentityCommitment, unSerialiseIdentity } from '@unirep/crypto'
import { verifyProof } from '@unirep/circuits'
import { genUserStateFromContract } from '@unirep/unirep'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'
import { identityPrefix } from './prefix'
import { UnirepSocialContract } from '../core/UnirepSocialContract'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'userStateTransition',
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
        '-id', '--identity',
        {
            required: true,
            type: 'str',
            help: 'The (serialized) user\'s identity',
        }
    )

    parser.add_argument(
        '-b', '--start-block',
        {
            action: 'store',
            type: 'int',
            help: 'The block the Unirep contract is deployed. Default: 0',
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

const userStateTransition = async (args: any) => {

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER
    const provider = new ethers.providers.JsonRpcProvider(ethProvider)

    // Unirep Social contract
    const unirepSocialContract = new UnirepSocialContract(args.contract, ethProvider)
    // Unirep contract
    const unirepContract = await unirepSocialContract.getUnirep()

    // Connect a signer
    await unirepSocialContract.unlock(args.eth_privkey)
    
    const startBlock = (args.start_block) ? args.start_block : DEFAULT_START_BLOCK

    // Gen epoch key proof
    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = unSerialiseIdentity(decodedIdentity)
    const commitment = genIdentityCommitment(id)
    const userState = await genUserStateFromContract(
        provider,
        unirepContract.address,
        startBlock,
        id,
        commitment,
    )
    console.log(userState.toJSON(4))
    let results

    // let circuitInputs: any

    if(args.from_database){
        console.log('generating proving circuit from database...')

        // circuitInputs = await genUserStateTransitionCircuitInputsFromDB(
        //     currentEpoch,
        //     id
        // )
    } else {

        console.log('generating proving circuit from contract...')

        const userState = await genUserStateFromContract(
            provider,
            unirepContract.address,
            startBlock,
            id,
            commitment,
        )
        results = await userState.genUserStateTransitionProofs()
        // circuitInputs = await userState.genUserStateTransitionCircuitInputs()

    }
    // Start user state transition proof
    let isValid = await verifyProof('startTransition', results.startTransitionProof.proof, results.startTransitionProof.publicSignals)
    if (!isValid) {
        console.error('Error: start state transition proof generated is not valid!')
    }

    // Process attestations proofs
    for (let i = 0; i < results.processAttestationProofs.length; i++) {
        const isValid = await verifyProof('processAttestations', results.processAttestationProofs[i].proof, results.processAttestationProofs[i].publicSignals)
        if (!isValid) {
            console.error('Error: process attestations proof generated is not valid!')
        }
    }

    // User state transition proof
    isValid = await verifyProof('userStateTransition', results.finalTransitionProof.proof, results.finalTransitionProof.publicSignals)
    if (!isValid) {
        console.error('Error: user state transition proof generated is not valid!')
    }

    // submit user state transition proofs
    const txList = await unirepSocialContract.userStateTransition(results)

    // const results = await genVerifyUserStateTransitionProofAndPublicSignals(stringifyBigInts(circuitInputs))
    // const newGSTLeaf = results['publicSignals'][0]
    // const newState = await userState.genNewUserStateAfterTransition()
    // if (newGSTLeaf != newState.newGSTLeaf.toString()) {
    //     console.error('Error: Computed new GST leaf should match')
    //     return
    // }
    
    // const isValid = await verifyUserStateTransitionProof(results['proof'], results['publicSignals'])
    // if (!isValid) {
    //     console.error('Error: user state transition proof generated is not valid!')
    //     return
    // }

    const fromEpoch = userState.latestTransitionedEpoch
    const toEpoch = userState.getUnirepStateCurrentEpoch()
    // const GSTreeRoot = userState.getUnirepStateGSTree(fromEpoch).root
    // const epochTreeRoot = (await userState.getUnirepStateEpochTree(fromEpoch)).getRootHash()
    // const nullifierTreeRoot = (await userState.getUnirepStateNullifierTree()).getRootHash()
    // const attestationNullifiers = userState.getAttestationNullifiers(fromEpoch)
    // const epkNullifiers = userState.getEpochKeyNullifiers(fromEpoch)
    // // Verify nullifiers outputted by circuit are the same as the ones computed off-chain
    // const outputAttestationNullifiers: BigInt[] = []
    // for (let i = 0; i < attestationNullifiers.length; i++) {
    //     const outputNullifier = results['publicSignals'][1+i]
    //     const modedOutputNullifier = BigInt(outputNullifier) % BigInt(2 ** nullifierTreeDepth)
    //     if (modedOutputNullifier != attestationNullifiers[i]) {
    //         console.error(`Error: nullifier outputted by circuit(${modedOutputNullifier}) does not match the ${i}-th computed attestation nullifier(${attestationNullifiers[i]})`)
    //         return
    //     }
    //     outputAttestationNullifiers.push(outputNullifier)
    // }
    // const outputEPKNullifiers: BigInt[] = []
    // for (let i = 0; i < epkNullifiers.length; i++) {
    //     const outputNullifier = results['publicSignals'][13+i]
    //     const modedOutputNullifier = BigInt(outputNullifier) % BigInt(2 ** nullifierTreeDepth)
    //     if (modedOutputNullifier != epkNullifiers[i]) {
    //         console.error(`Error: nullifier outputted by circuit(${modedOutputNullifier}) does not match the ${i}-th computed attestation nullifier(${epkNullifiers[i]})`)
    //         return
    //     }
    //     outputEPKNullifiers.push(outputNullifier)
    // }

    // let tx
    // try {
    //     tx = await unirepSocialContract.updateUserStateRoot(
    //         newGSTLeaf,
    //         outputAttestationNullifiers,
    //         outputEPKNullifiers,
    //         fromEpoch,
    //         GSTreeRoot,
    //         epochTreeRoot,
    //         nullifierTreeRoot,
    //         formatProofForVerifierContract(results['proof']),
    //     )
    // } catch(e) {
    //     console.error('Error: the transaction failed')
    //     if (e.message) {
    //         console.error(e.message)
    //     }
    //     return
    // }

    console.log('Transaction hash:', txList[txList.length - 1]?.hash)
    if(txList[0] != undefined){
        console.log(`User transitioned from epoch ${fromEpoch} to epoch ${toEpoch}`)  
    }
    process.exit(0)      
}

export {
    userStateTransition,
    configureSubparser,
}