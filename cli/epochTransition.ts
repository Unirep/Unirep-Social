import { DEFAULT_ETH_PROVIDER } from './defaults'
import { UnirepSocialContract } from '../core/UnirepSocialContract'

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
            required: true,
            action: 'store',
            type: 'str',
            help: 'The deployer\'s Ethereum private key',
        }
    )
}

const epochTransition = async (args: any) => {

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER

    // Unirep Social contract
    const unirepSocialContract = new UnirepSocialContract(args.contract, ethProvider)
    const unirepContract = await unirepSocialContract.getUnirep()

    // Connect a signer
    await unirepSocialContract.unlock(args.eth_privkey)

    // Fast-forward to end of epoch if in test environment
    if (args.is_test) {
        await unirepSocialContract.fastForward()
    }

    const currentEpoch = await unirepContract.currentEpoch()
    const tx = await unirepSocialContract.epochTransition()
    await tx.wait()

    console.log('Transaction hash:', tx?.hash)
    console.log('End of epoch:', currentEpoch.toString())
}

export {
    epochTransition,
    configureSubparser,
}