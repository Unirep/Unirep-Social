"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.genEpochKey = exports.deployUnirepSocial = exports.getTreeDepthsForTesting = exports.computeEmptyUserStateRoot = exports.SMT_ZERO_LEAF = exports.SMT_ONE_LEAF = exports.defaultUserStateLeaf = void 0;
// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2305 will be reported.
// @ts-ignore
const hardhat_1 = require("hardhat");
const UnirepSocial_json_1 = __importDefault(require("../artifacts/contracts/UnirepSocial.sol/UnirepSocial.json"));
const unirep_1 = require("@unirep/unirep");
const maci_crypto_1 = require("maci-crypto");
const socialMedia_1 = require("../config/socialMedia");
const defaultUserStateLeaf = (0, maci_crypto_1.hash5)([BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)]);
exports.defaultUserStateLeaf = defaultUserStateLeaf;
const SMT_ZERO_LEAF = (0, maci_crypto_1.hashLeftRight)(BigInt(0), BigInt(0));
exports.SMT_ZERO_LEAF = SMT_ZERO_LEAF;
const SMT_ONE_LEAF = (0, maci_crypto_1.hashLeftRight)(BigInt(1), BigInt(0));
exports.SMT_ONE_LEAF = SMT_ONE_LEAF;
const computeEmptyUserStateRoot = (treeDepth) => {
    const t = new maci_crypto_1.IncrementalQuinTree(treeDepth, defaultUserStateLeaf, 2);
    return t.root;
};
exports.computeEmptyUserStateRoot = computeEmptyUserStateRoot;
const getTreeDepthsForTesting = (deployEnv = "circuit") => {
    if (deployEnv === 'contract') {
        return {
            "userStateTreeDepth": unirep_1.userStateTreeDepth,
            "globalStateTreeDepth": unirep_1.globalStateTreeDepth,
            "epochTreeDepth": unirep_1.epochTreeDepth,
        };
    }
    else if (deployEnv === 'circuit') {
        return {
            "userStateTreeDepth": unirep_1.circuitUserStateTreeDepth,
            "globalStateTreeDepth": unirep_1.circuitGlobalStateTreeDepth,
            "epochTreeDepth": unirep_1.circuitEpochTreeDepth,
        };
    }
    else {
        throw new Error('Only contract and circuit testing env are supported');
    }
};
exports.getTreeDepthsForTesting = getTreeDepthsForTesting;
const deployUnirepSocial = async (deployer, UnirepAddr, _settings) => {
    console.log('Deploying Unirep Social');
    const _defaultAirdroppedRep = socialMedia_1.defaultAirdroppedReputation;
    const _postReputation = socialMedia_1.defaultPostReputation;
    const _commentReputation = socialMedia_1.defaultCommentReputation;
    const f = await hardhat_1.ethers.getContractFactory("UnirepSocial", {
        signer: deployer,
    });
    const c = await (f.deploy(UnirepAddr, _postReputation, _commentReputation, _defaultAirdroppedRep, {
        gasLimit: 9000000,
    }));
    // Print out deployment info
    console.log("-----------------------------------------------------------------");
    console.log("Bytecode size of Unirep Social:", Math.floor(UnirepSocial_json_1.default.bytecode.length / 2), "bytes");
    let receipt = await c.provider.getTransactionReceipt(c.deployTransaction.hash);
    console.log("Gas cost of deploying Unirep Social:", receipt.gasUsed.toString());
    console.log("-----------------------------------------------------------------");
    return c;
};
exports.deployUnirepSocial = deployUnirepSocial;
const genEpochKey = (identityNullifier, epoch, nonce, _epochTreeDepth = unirep_1.epochTreeDepth) => {
    const values = [
        identityNullifier,
        epoch,
        nonce,
        BigInt(0),
        BigInt(0),
    ];
    let epochKey = (0, maci_crypto_1.hash5)(values);
    // Adjust epoch key size according to epoch tree depth
    const epochKeyModed = BigInt(epochKey.toString()) % BigInt(2 ** _epochTreeDepth);
    return epochKeyModed;
};
exports.genEpochKey = genEpochKey;
