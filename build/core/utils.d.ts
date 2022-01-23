import { ethers } from 'ethers';
declare const deployUnirepSocial: (deployer: ethers.Signer, UnirepAddr: string, _settings?: any) => Promise<ethers.Contract>;
export { deployUnirepSocial, };
