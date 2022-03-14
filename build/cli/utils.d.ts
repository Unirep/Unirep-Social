import { ethers } from 'ethers';
declare const getProvider: (url: string) => ethers.providers.Provider;
declare class JSONRPCDeployer {
    provider: ethers.providers.Provider;
    signer: ethers.Signer;
    options: any;
    constructor(privateKey: string, provider: ethers.providers.Provider, options?: any);
    deploy(abi: any, bytecode: any, ...args: any[]): Promise<ethers.Contract>;
}
declare const genJsonRpcDeployer: (privateKey: string, provider: ethers.providers.Provider) => JSONRPCDeployer;
declare const checkDeployerProviderConnection: (sk: string, provider: ethers.providers.Provider) => Promise<boolean>;
declare const validateEthSk: (sk: string) => boolean;
declare const validateEthAddress: (address: string) => boolean;
declare const contractExists: (provider: ethers.providers.Provider, address: string) => Promise<boolean>;
export { getProvider, checkDeployerProviderConnection, contractExists, genJsonRpcDeployer, validateEthAddress, validateEthSk, };
