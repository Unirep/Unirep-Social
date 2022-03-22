import { DEFAULT_ETH_PROVIDER, DEFAULT_PRIVATE_KEY } from './defaults'
import { UnirepSocialFacory } from '../core/utils'
import { ethers } from 'ethers'
import { Unirep } from '@unirep/contracts'
import { getProvider } from './utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('epochTransition', { add_help: true })

    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
    })

    parser.add_argument('-t', '--is-test', {
        action: 'store_true',
        help: 'Indicate if the provider is a testing environment',
    })

    parser.add_argument('-x', '--contract', {
        required: true,
        type: 'str',
        help: 'The Unirep Social contract address',
    })

    parser.add_argument('-d', '--eth-privkey', {
        action: 'store',
        type: 'str',
        help: "The deployer's Ethereum private key. Default: set in the `.env` file",
    })
}

const epochTransition = async (args: any) => {
    // Ethereum provider
    const ethProvider = args.eth_provider
        ? args.eth_provider
        : DEFAULT_ETH_PROVIDER
    const provider = getProvider(ethProvider)

    // Unirep Social contract
    const unirepSocialContract = UnirepSocialFacory.connect(
        args.contract,
        provider
    )
    const unirepContractAddr = await unirepSocialContract.unirep()
    const unirepContract = new ethers.Contract(
        unirepContractAddr,
        Unirep.abi,
        provider
    )

    // Connect a signer
    const privKey = args.eth_privkey ? args.eth_privkey : DEFAULT_PRIVATE_KEY
    const wallet = new ethers.Wallet(privKey, provider)

    // Fast-forward to end of epoch if in test environment
    if (args.is_test) {
        const epochLength = (await unirepContract?.epochLength()).toNumber()
        await (provider as any).send('evm_increaseTime', [epochLength])
    }

    const currentEpoch = await unirepContract.currentEpoch()
    let tx
    try {
        tx = await unirepContract.connect(wallet).beginEpochTransition()
    } catch (error) {
        console.log('Transaction Error', error)
        return
    }

    await tx.wait()
    console.log('Transaction hash:', tx?.hash)
    console.log('End of epoch:', currentEpoch.toString())
}

export { epochTransition, configureSubparser }
