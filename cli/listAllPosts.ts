import { DEFAULT_ETH_PROVIDER } from './defaults'
import { UnirepSocialContract } from '../core/UnirepSocialContract'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'listAllPosts',
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
        '-x', '--contract',
        {
            required: true,
            type: 'str',
            help: 'The Unirep Social contract address',
        }
    )

    parser.add_argument(
        '-ep', '--epoch',
        {
            action: 'store',
            type: 'int',
            help: 'The post in the certain epoch. Default: list all posts in all of epoch',
        }
    )
}

const listAllPosts = async (args: any) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER

    // Unirep Social contract
    const unirepSocialContract = new UnirepSocialContract(args.contract, ethProvider)
    const postEvents = await unirepSocialContract.getPostEvents(args.epoch)

    for (let i = 0; i < postEvents.length; i++) {
        console.log('Post ', postEvents[i].args._postId.toString())
        console.log('Epoch key ', postEvents[i].args._epochKey.toString())
        console.log('Content ', postEvents[i].args._hahsedContent)
    }
}

export {
    listAllPosts,
    configureSubparser,
}