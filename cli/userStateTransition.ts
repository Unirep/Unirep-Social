import base64url from 'base64url'
import { ethers } from 'ethers'
import { unSerialiseIdentity } from '@unirep/crypto'
import { Circuit, verifyProof } from '@unirep/circuits'
import { genUserStateFromContract } from '@unirep/unirep'

import { DEFAULT_ETH_PROVIDER } from './defaults'
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
        '-d', '--eth-privkey',
        {
            required: true,
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
    
    // Gen epoch key proof
    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = unSerialiseIdentity(decodedIdentity)
    const userState = await genUserStateFromContract(
        provider,
        unirepContract.address,
        id,
    )
    const results = await userState.genUserStateTransitionProofs()

    // Start user state transition proof
    let isValid = await verifyProof(
        Circuit.startTransition, 
        results.startTransitionProof.proof, 
        results.startTransitionProof.publicSignals
    )
    if (!isValid) {
        console.error('Error: start state transition proof generated is not valid!')
        return
    }

    // Process attestations proofs
    for (let i = 0; i < results.processAttestationProofs.length; i++) {
        const isValid = await verifyProof(
            Circuit.processAttestations, 
            results.processAttestationProofs[i].proof, 
            results.processAttestationProofs[i].publicSignals
        )
        if (!isValid) {
            console.error('Error: process attestations proof generated is not valid!')
            return
        }
    }

    // User state transition proof
    isValid = await verifyProof(
        Circuit.userStateTransition, 
        results.finalTransitionProof.proof, 
        results.finalTransitionProof.publicSignals
    )
    if (!isValid) {
        console.error('Error: user state transition proof generated is not valid!')
        return
    }

    // submit user state transition proofs
    const txList = await unirepSocialContract.userStateTransition(results)

    const fromEpoch = userState.latestTransitionedEpoch
    const toEpoch = userState.getUnirepStateCurrentEpoch()

    if(txList[0] != undefined){
        console.log('Transaction hash:', txList[txList.length - 1]?.hash)
        console.log(`User transitioned from epoch ${fromEpoch} to epoch ${toEpoch}`)  
    }     
}

export {
    userStateTransition,
    configureSubparser,
}