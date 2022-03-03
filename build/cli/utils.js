"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEthSk = exports.validateEthAddress = exports.genJsonRpcDeployer = exports.contractExists = exports.checkDeployerProviderConnection = void 0;
const ethers_1 = require("ethers");
class JSONRPCDeployer {
    constructor(privateKey, provider, options) {
        this.provider = provider;
        this.signer = new ethers_1.ethers.Wallet(privateKey, this.provider);
        this.options = options;
    }
    async deploy(abi, bytecode, ...args) {
        const factory = new ethers_1.ethers.ContractFactory(abi, bytecode, this.signer);
        return await factory.deploy(...args);
    }
}
const genJsonRpcDeployer = (privateKey, provider) => {
    return new JSONRPCDeployer(privateKey, provider);
};
exports.genJsonRpcDeployer = genJsonRpcDeployer;
const checkDeployerProviderConnection = async (sk, provider) => {
    const deployer = genJsonRpcDeployer(sk, provider);
    try {
        await deployer.provider.getBlockNumber();
    }
    catch (_a) {
        return false;
    }
    return true;
};
exports.checkDeployerProviderConnection = checkDeployerProviderConnection;
const validateEthSk = (sk) => {
    try {
        new ethers_1.ethers.Wallet(sk);
    }
    catch (_a) {
        return false;
    }
    return true;
};
exports.validateEthSk = validateEthSk;
const validateEthAddress = (address) => {
    return address.match(/^0x[a-fA-F0-9]{40}$/) != null;
};
exports.validateEthAddress = validateEthAddress;
const contractExists = async (provider, address) => {
    const code = await provider.getCode(address);
    return code.length > 2;
};
exports.contractExists = contractExists;
