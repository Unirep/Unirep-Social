import { ethers } from 'ethers'
import { Unirep__factory as UnirepFactory } from '../typechain/factories/Unirep__factory'
import { UnirepSocial__factory as UnirepSocialFactory } from '../typechain/factories/UnirepSocial__factory'
import { UnirepSocial } from '../typechain/UnirepSocial'
import { Unirep } from '../typechain/Unirep'
declare const deployUnirepSocial: (
    deployer: ethers.Signer,
    UnirepAddr: string,
    _settings?: any
) => Promise<UnirepSocial>
export {
    deployUnirepSocial,
    UnirepFactory,
    UnirepSocialFactory,
    UnirepSocial,
    Unirep,
}
