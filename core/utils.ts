import { ethers } from 'ethers'

import { defaultAirdroppedReputation, defaultCommentReputation, defaultPostReputation } from '../config/socialMedia'
import { Unirep__factory as UnirepFactory } from '../typechain/factories/Unirep__factory'
import { UnirepSocial__factory as UnirepSocialFacory } from '../typechain/factories/UnirepSocial__factory'
import { UnirepSocial } from '../typechain/UnirepSocial'

const deployUnirepSocial = async (
    deployer: ethers.Signer,
    UnirepAddr: string,
    _settings?: any): Promise<UnirepSocial> => {

    console.log('Deploying Unirep Social')

    const _defaultAirdroppedRep = defaultAirdroppedReputation
    const _postReputation = defaultPostReputation
    const _commentReputation = defaultCommentReputation
    
    const f = new UnirepSocialFacory(deployer)
    const c = await (f.deploy(
        UnirepAddr,
        _postReputation,
        _commentReputation,
        _defaultAirdroppedRep,
        {
            gasLimit: 9000000,
        }
    ))
    await c.deployTransaction.wait()

    // Print out deployment info
    console.log("-----------------------------------------------------------------")
    console.log("Bytecode size of Unirep Social:", Math.floor(UnirepFactory.bytecode.length / 2), "bytes")
    let receipt = await c.provider.getTransactionReceipt(c.deployTransaction.hash)
    console.log("Gas cost of deploying Unirep Social:", receipt.gasUsed.toString())
    console.log("-----------------------------------------------------------------")

    return c
}

export {
    deployUnirepSocial,
    UnirepSocialFacory,
    UnirepSocial,
}