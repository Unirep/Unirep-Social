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
import NegativeRepVerifier from '../artifacts/contracts/NegativeRepVerifier.sol/Verifier.json'
import SubsidyKeyVerifier from '../artifacts/contracts/SubsidyKeyVerifier.sol/Verifier.json'

// TODO: use export package from '@unirep/unirep'
import { Unirep } from '../typechain/Unirep'

const deployUnirepSocial = async (
    deployer: ethers.Signer,
    UnirepAddr: string,
    _settings?: any
): Promise<UnirepSocial> => {
    const settings = {
        airdropReputation: defaultAirdroppedReputation,
        postReputation: defaultPostReputation,
        commentReputation: defaultCommentReputation,
        epkSubsidy: defaultEpkSubsidy,
        ..._settings,
    }
    console.log('Deploying NegativeRepVerifier')
    const NegativeRepVerifierF = new ethers.ContractFactory(
        NegativeRepVerifier.abi,
        NegativeRepVerifier.bytecode,
        deployer
    )
    const negativeRepVerifier = await NegativeRepVerifierF.deploy()
    await negativeRepVerifier.deployed()
    console.log('Deploying SubsidyKeyVerifier')
    const SubsidyKeyVerifierF = new ethers.ContractFactory(
        SubsidyKeyVerifier.abi,
        SubsidyKeyVerifier.bytecode,
        deployer
    )
    const subsidyKeyVerifier = await SubsidyKeyVerifierF.deploy()
    await subsidyKeyVerifier.deployed()

    console.log('Deploying Unirep Social')
    const f = new UnirepSocialFactory(deployer)
    const c = await f.deploy(
        UnirepAddr,
        negativeRepVerifier.address,
        subsidyKeyVerifier.address,
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
