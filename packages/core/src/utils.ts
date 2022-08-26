import { ethers } from 'ethers'

import {
    defaultAirdroppedReputation,
    defaultCommentReputation,
    defaultPostReputation,
    defaultEpkSubsidy,
} from '../config/socialMedia'
import { Unirep__factory as UnirepFactory } from '../typechain/factories/Unirep__factory'
import { UnirepSocial__factory as UnirepSocialFactory } from '../typechain/factories/UnirepSocial__factory'
import { UnirepSocial } from '../typechain/UnirepSocial'

// TODO: use export package from '@unirep/unirep'
import { Unirep } from '../typechain/Unirep'

const deployUnirepSocial = async (
    deployer: ethers.Signer,
    UnirepAddr: string,
    _settings?: any
): Promise<UnirepSocial> => {
    console.log('Deploying Unirep Social')

    const settings = {
        airdropReputation: defaultAirdroppedReputation,
        postReputation: defaultPostReputation,
        commentReputation: defaultCommentReputation,
        epkSubsidy: defaultEpkSubsidy,
        ..._settings,
    }

    const f = new UnirepSocialFactory(deployer)
    const c = await f.deploy(
        UnirepAddr,
        '0x0000000000000000000000000000000000000000', // TODO: placeholder for verifier
        '0x0000000000000000000000000000000000000000', // TODO: placeholder for verifier
        settings.postReputation,
        settings.commentReputation,
        settings.airdropReputation,
        settings.epkSubsidy,
        {
            gasLimit: 9000000,
        }
    )
    await c.deployTransaction.wait()

    // Print out deployment info
    console.log(
        '-----------------------------------------------------------------'
    )
    console.log(
        'Bytecode size of Unirep Social:',
        Math.floor(UnirepFactory.bytecode.length / 2),
        'bytes'
    )
    let receipt = await c.provider.getTransactionReceipt(
        c.deployTransaction.hash
    )
    console.log(
        'Gas cost of deploying Unirep Social:',
        receipt.gasUsed.toString()
    )
    console.log(
        '-----------------------------------------------------------------'
    )

    return c
}

export {
    deployUnirepSocial,
    UnirepFactory,
    UnirepSocialFactory,
    UnirepSocial,
    Unirep,
}
