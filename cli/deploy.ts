// @ts-ignore
import { ethers } from 'ethers'
import * as config from '@unirep/config'
import { deployUnirep, getUnirepContract } from '@unirep/contracts'
import * as socialMediaConfig from '../config/socialMedia'
import { deployUnirepSocial } from '../core/utils'
import * as defaultConfig from './defaults'

import {
    checkDeployerProviderConnection,
    genJsonRpcDeployer,
    getProvider,
    validateEthSk,
} from './utils'

const configureSubparser = (subparsers: any) => {
    const deployParser = subparsers.add_parser('deploy', { add_help: true })

    deployParser.add_argument('-d', '--deployer-privkey', {
        action: 'store',
        type: 'str',
        help: "The deployer's Ethereum private key. Default: set in the `.env` file",
    })

    deployParser.add_argument('-x', '--contract', {
        type: 'str',
        help: 'Unirep contract address. If it is not provided, a Unirep contract will be created in the process.',
    })

    deployParser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${defaultConfig.DEFAULT_ETH_PROVIDER}`,
    })

    deployParser.add_argument('-l', '--epoch-length', {
        action: 'store',
        type: 'int',
        help: 'The length of an epoch in seconds. Default: 30',
    })

    deployParser.add_argument('-f', '--attesting-fee', {
        action: 'store',
        type: 'str',
        help: 'The fee to make an attestation. Default: 0.01 eth (i.e., 10 * 16)',
    })

    deployParser.add_argument('-p', '--post_reputation', {
        action: 'store',
        type: 'int',
        help: `The amount of reputation required to publish a post. Default: ${socialMediaConfig.defaultPostReputation}`,
    })

    deployParser.add_argument('-c', '--comment_reputation', {
        action: 'store',
        type: 'int',
        help: `The amount of reputation required to leave a comment. Default: ${socialMediaConfig.defaultCommentReputation}`,
    })

    deployParser.add_argument('-a', '--airdrop_reputation', {
        action: 'store',
        type: 'int',
        help: `The amount of airdrop reputation that is given when user signs up and user performs user state transition. Default: ${socialMediaConfig.defaultAirdroppedReputation}`,
    })
}

const deploy = async (args: any) => {
    // The deployer's Ethereum private key
    const deployerPrivkey = args.deployer_privkey
        ? args.deployer_privkey
        : defaultConfig.DEFAULT_PRIVATE_KEY

    if (!validateEthSk(deployerPrivkey)) {
        console.error('Error: invalid Ethereum private key')
        return
    }

    // Max epoch key nonce
    // const _numEpochKeyNoncePerEpoch = (args.max_epoch_key_nonce != undefined) ? args.max_epoch_key_nonce : DEFAULT_MAX_EPOCH_KEY_NONCE
    const _numEpochKeyNoncePerEpoch = defaultConfig.DEFAULT_MAX_EPOCH_KEY_NONCE

    const _maxReputationBudget = config.MAX_REPUTATION_BUDGET

    // Epoch length
    const _epochLength =
        args.epoch_length != undefined
            ? args.epoch_length
            : defaultConfig.DEFAULT_EPOCH_LENGTH

    // Attesting fee
    const _attestingFee =
        args.attesting_fee != undefined
            ? ethers.BigNumber.from(args.attesting_fee)
            : defaultConfig.DEFAULT_ATTESTING_FEE

    const UnirepSettings = {
        maxUsers: config.MAX_USERS,
        maxAttesters: config.MAX_ATTESTERS,
        numEpochKeyNoncePerEpoch: _numEpochKeyNoncePerEpoch,
        maxReputationBudget: _maxReputationBudget,
        epochLength: _epochLength,
        attestingFee: _attestingFee,
    }

    const treeDepths = {
        userStateTreeDepth: config.USER_STATE_TREE_DEPTH,
        globalStateTreeDepth: config.GLOBAL_STATE_TREE_DEPTH,
        epochTreeDepth: config.EPOCH_TREE_DEPTH,
    }
    const _postReputation =
        args.post_reputation != undefined
            ? args.post_reputation
            : socialMediaConfig.defaultPostReputation

    const _commentReputation =
        args.comment_reputation != undefined
            ? args.comment_reputation
            : socialMediaConfig.defaultCommentReputation

    const _airdropReputation =
        args.airdrop != undefined
            ? args.airdrop_reputation
            : socialMediaConfig.defaultAirdroppedReputation

    const UnirepSocialSettings = {
        postReputation: _postReputation,
        commentReputation: _commentReputation,
        airdropReputation: _airdropReputation,
    }

    // Ethereum provider
    const ethProvider =
        args.eth_provider !== undefined
            ? args.eth_provider
            : defaultConfig.DEFAULT_ETH_PROVIDER
    const provider = getProvider(ethProvider)

    if (!(await checkDeployerProviderConnection(deployerPrivkey, provider))) {
        console.error(
            'Error: unable to connect to the Ethereum provider at',
            ethProvider
        )
        return
    }
    const deployer = genJsonRpcDeployer(deployerPrivkey, provider)

    let unirepContract
    if (args.contract == null) {
        unirepContract = await deployUnirep(
            deployer.signer,
            treeDepths,
            UnirepSettings
        )
    } else {
        // Unirep contract
        unirepContract = getUnirepContract(args.contract, provider)
    }

    const unirepSocialContract = await deployUnirepSocial(
        deployer.signer,
        unirepContract.address,
        UnirepSocialSettings
    )

    console.log('Unirep:', unirepContract.address)
    console.log('Unirep Social:', unirepSocialContract.address)
}

export { deploy, configureSubparser }
