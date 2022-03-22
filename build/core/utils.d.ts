import { ethers } from 'ethers'
import { UnirepSocial__factory as UnirepSocialFacory } from '../typechain/factories/UnirepSocial__factory'
import { UnirepSocial } from '../typechain/UnirepSocial'
declare const deployUnirepSocial: (
    deployer: ethers.Signer,
    UnirepAddr: string,
    _settings?: any
) => Promise<UnirepSocial>
export { deployUnirepSocial, UnirepSocialFacory, UnirepSocial }
