import { ethers } from 'ethers'

import { Circuit } from '@unirep/circuits'
import {
    // defaultAirdroppedReputation,
    defaultCommentReputation,
    defaultPostReputation,
    defaultEpkSubsidy,
    defaultEpochLength,
    maxReputationBudget,
} from '../src/config'
import { deployVerifierHelper } from '@unirep/contracts/deploy'
import { Unirep__factory as UnirepFactory } from '../typechain'
import { UnirepSocial__factory as UnirepSocialFactory } from '../typechain'
import { UnirepSocial } from '../typechain'
import ActionVerifier from '../artifacts/contracts/ActionProofVerifier.sol/ActionProofVerifier.json'

import { Unirep } from '@unirep/contracts'

const deployUnirepSocial = async (
    deployer: ethers.Signer,
    UnirepAddr: string,
    _settings: any = {}
): Promise<UnirepSocial> => {
    const settings = {
        // airdropReputation: defaultAirdroppedReputation,
        postReputation: defaultPostReputation,
        commentReputation: defaultCommentReputation,
        epkSubsidy: defaultEpkSubsidy,
        epochLength: defaultEpochLength,
        maxReputationBudget: maxReputationBudget,
        ..._settings,
    }
    const epkHelper = await deployVerifierHelper(deployer, Circuit.epochKeyLite)
    const repHelper = await deployVerifierHelper(
        deployer,
        Circuit.proveReputation
    )
    console.log('Deploying ActionVerifier')
    const ActionVerifierF = new ethers.ContractFactory(
        ActionVerifier.abi,
        ActionVerifier.bytecode,
        deployer
    )
    const actionVerifier = await ActionVerifierF.deploy()
    await actionVerifier.deployed()

    console.log('Deploying Unirep Social')
    const f = new UnirepSocialFactory(deployer)
    const c = await f.deploy(
        UnirepAddr,
        actionVerifier.address,
        epkHelper.address,
        repHelper.address,
        settings.postReputation,
        settings.commentReputation,
        // settings.airdropReputation,
        settings.epkSubsidy,
        settings.epochLength,
        settings.maxReputationBudget,
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
    const receipt = await c.provider.getTransactionReceipt(
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
