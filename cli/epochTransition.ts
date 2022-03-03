import { DEFAULT_ETH_PROVIDER, DEFAULT_PRIVATE_KEY } from './defaults'
import { UnirepSocialContract } from '../core/UnirepSocialContract'
import { ethers } from 'ethers'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'epochTransition',
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
        '-t', '--is-test',
        {
            action: 'store_true',
            help: 'Indicate if the provider is a testing environment',
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
            action: 'store',
            type: 'str',
            help: 'The deployer\'s Ethereum private key. Default: set in the `.env` file',
        }
    )
}

const epochTransition = async (args: any) => {

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER
    const provider = new ethers.providers.WebSocketProvider(ethProvider)

    // Unirep Social contract
    const unirepSocialContract = new UnirepSocialContract(args.contract, provider)
    const unirepContract = await unirepSocialContract.getUnirep()

    // Connect a signer
    const privKey = args.eth_privkey ? args.eth_privkey : DEFAULT_PRIVATE_KEY
    await unirepSocialContract.unlock(privKey)

    // Fast-forward to end of epoch if in test environment
    if (args.is_test) {
        const epochLength = (await unirepContract?.epochLength()).toNumber()
        await provider.send("evm_increaseTime", [epochLength])
    }

    const currentEpoch = await unirepContract.currentEpoch()
    let tx
    try {
        tx = await unirepSocialContract.epochTransition()
    } catch (error) {
        console.log('Transaction Error', error)
        return
    }
    
    await tx.wait()
    console.log('Transaction hash:', tx?.hash)
    console.log('End of epoch:', currentEpoch.toString())
}

export {
    epochTransition,
    configureSubparser,
}