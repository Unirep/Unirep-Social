import { ethers } from 'ethers';
import { SnarkBigInt } from 'maci-crypto';
declare const defaultUserStateLeaf: BigInt;
declare const SMT_ZERO_LEAF: BigInt;
declare const SMT_ONE_LEAF: BigInt;
declare const computeEmptyUserStateRoot: (treeDepth: number) => BigInt;
declare const getTreeDepthsForTesting: (deployEnv?: string) => {
    userStateTreeDepth: number;
    globalStateTreeDepth: number;
    epochTreeDepth: number;
};
declare const deployUnirepSocial: (deployer: ethers.Signer, UnirepAddr: string, _settings?: any) => Promise<ethers.Contract>;
declare const genEpochKey: (identityNullifier: SnarkBigInt, epoch: number, nonce: number, _epochTreeDepth?: number) => SnarkBigInt;
export { defaultUserStateLeaf, SMT_ONE_LEAF, SMT_ZERO_LEAF, computeEmptyUserStateRoot, getTreeDepthsForTesting, deployUnirepSocial, genEpochKey, };
