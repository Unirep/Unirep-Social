// @ts-ignore
import { ethers } from 'ethers'
import { defaultAirdroppedReputation, defaultCommentReputation, defaultPostReputation } from '../config/socialMedia'
import { maxUsers, maxAttesters, maxReputationBudget } from '@unirep/unirep'
import { deployUnirep, getUnirepContract } from '@unirep/contracts'
import { deployUnirepSocial, getTreeDepthsForTesting } from '../core/utils'
import { DEFAULT_ATTESTING_FEE, DEFAULT_EPOCH_LENGTH, DEFAULT_ETH_PROVIDER, DEFAULT_MAX_EPOCH_KEY_NONCE, DEFAULT_TREE_DEPTHS_CONFIG } from './defaults'

import {
    checkDeployerProviderConnection,
    genJsonRpcDeployer,
    validateEthSk,
} from './utils'

const configureSubparser = (subparsers: any) => {
    const deployParser = subparsers.add_parser(
        'deploy',
        { add_help: true },
    )

    deployParser.add_argument(
        '-d', '--deployer-privkey',
        {
            action: 'store',
            type: 'str',
            help: 'The deployer\'s Ethereum private key',
        }
    )

    deployParser.add_argument(
        '-x', '--contract',
        {
            type: 'str',
            help: 'Unirep contract address. If it is not provided, a Unirep contract will be created in the process.',
        }
    )

    deployParser.add_argument(
        '-e', '--eth-provider',
        {
            action: 'store',
            type: 'str',
            help: 'A connection string to an Ethereum provider. Default: http://localhost:8545',
        }
    )

    deployParser.add_argument(
        '-l', '--epoch-length',
        {
            action: 'store',
            type: 'int',
            help: 'The length of an epoch in seconds. Default: 30',
        }
    )

    deployParser.add_argument(
        '-f', '--attesting-fee',
        {
            action: 'store',
            type: 'str',
            help: 'The fee to make an attestation. Default: 0.01 eth (i.e., 10 * 16)',
        }
    )

    deployParser.add_argument(
        '-td', '--tree-depths-config',
        {
            action: 'store',
            type: 'str',
            help: 'The configuration of tree depths: circuit or contract. Default: circuit',
        }
    )

    deployParser.add_argument(
        '-p', '--post_reputation',
        {
            action: 'store',
            type: 'int',
            help: `The amount of reputation required to publish a post. Default: ${defaultPostReputation}`,
        }
    )

    deployParser.add_argument(
        '-c', '--comment_reputation',
        {
            action: 'store',
            type: 'int',
            help: `The amount of reputation required to leave a comment. Default: ${defaultCommentReputation}`,
        }
    )

    deployParser.add_argument(
        '-a', '--airdrop_reputation',
        {
            action: 'store',
            type: 'int',
            help: `The amount of airdrop reputation that is given when user signs up and user performs user state transition. Default: ${defaultAirdroppedReputation}`,
        }
    )

}

const deploy = async (args: any) => {

    // The deployer's Ethereum private key
    const deployerPrivkey = args.deployer_privkey

    if (!validateEthSk(deployerPrivkey)) {
        console.error('Error: invalid Ethereum private key')
        return
    }

    // Max epoch key nonce
    // const _numEpochKeyNoncePerEpoch = (args.max_epoch_key_nonce != undefined) ? args.max_epoch_key_nonce : DEFAULT_MAX_EPOCH_KEY_NONCE
    const _numEpochKeyNoncePerEpoch = DEFAULT_MAX_EPOCH_KEY_NONCE

    const _maxReputationBudget = maxReputationBudget

    // Epoch length
    const _epochLength = (args.epoch_length != undefined) ? args.epoch_length : DEFAULT_EPOCH_LENGTH

    // Attesting fee
    const _attestingFee = (args.attesting_fee != undefined) ? ethers.BigNumber.from(args.attesting_fee) : DEFAULT_ATTESTING_FEE

    const UnirepSettings = {
        maxUsers: maxUsers,
        maxAttesters: maxAttesters,
        numEpochKeyNoncePerEpoch: _numEpochKeyNoncePerEpoch,
        maxReputationBudget: _maxReputationBudget,
        epochLength: _epochLength,
        attestingFee: _attestingFee
    }

    // Tree depths config
    const _treeDepthsConfig = args.tree_depths_config ? args.tree_depths_config : DEFAULT_TREE_DEPTHS_CONFIG

    if (_treeDepthsConfig !== 'circuit' && _treeDepthsConfig !== 'contract') {
        console.error('Error: this codebase only supports circuit or contract configurations for tree depths')
        return
    }

    const treeDepths = getTreeDepthsForTesting(_treeDepthsConfig)

    const _postReputation = (args.post_reputation != undefined) ? args.post_reputation : defaultPostReputation

    const _commentReputation = (args.comment_reputation != undefined) ? args.comment_reputation : defaultCommentReputation

    const _airdropReputation = (args.airdrop != undefined) ? args.airdrop_reputation : defaultAirdroppedReputation

    const UnirepSocialSettings = {
        postReputation: _postReputation,
        commentReputation: _commentReputation,
        airdropReputation: _airdropReputation,
    }

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER
    const provider = new ethers.providers.JsonRpcProvider(ethProvider)

    if (! (await checkDeployerProviderConnection(deployerPrivkey, ethProvider))) {
        console.error('Error: unable to connect to the Ethereum provider at', ethProvider)
        return
    }
    const deployer = genJsonRpcDeployer(deployerPrivkey, ethProvider)
    
    let unirepContract
    if(args.contract == null){
        unirepContract = await deployUnirep(
            deployer.signer,
            treeDepths,
            UnirepSettings,
        )
    } else {
        // Unirep contract
        unirepContract = getUnirepContract(
            args.contract,
            provider,
        )
    }

    const unirepSocialContract = await deployUnirepSocial(
        deployer.signer,
        unirepContract.address,
        UnirepSocialSettings,
    )

    console.log('Unirep:', unirepContract.address)
    console.log('Unirep Social:', unirepSocialContract.address)
}

export {
    deploy,
    configureSubparser,
}