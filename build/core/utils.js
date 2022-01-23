"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployUnirepSocial = void 0;
const ethers_1 = require("ethers");
const UnirepSocial_json_1 = __importDefault(require("../artifacts/contracts/UnirepSocial.sol/UnirepSocial.json"));
const unirep_1 = require("@unirep/unirep");
const maci_crypto_1 = require("maci-crypto");
const socialMedia_1 = require("../config/socialMedia");
const defaultUserStateLeaf = maci_crypto_1.hash5([BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)]);
const SMT_ZERO_LEAF = maci_crypto_1.hashLeftRight(BigInt(0), BigInt(0));
const SMT_ONE_LEAF = maci_crypto_1.hashLeftRight(BigInt(1), BigInt(0));
const computeEmptyUserStateRoot = (treeDepth) => {
    const t = new maci_crypto_1.IncrementalQuinTree(treeDepth, defaultUserStateLeaf, 2);
    return t.root;
};
const deployUnirepSocial = async (deployer, UnirepAddr, _settings) => {
    console.log('Deploying Unirep Social');
    const _defaultAirdroppedRep = socialMedia_1.defaultAirdroppedReputation;
    const _postReputation = socialMedia_1.defaultPostReputation;
    const _commentReputation = socialMedia_1.defaultCommentReputation;
    const f = new ethers_1.ethers.ContractFactory(UnirepSocial_json_1.default.abi, UnirepSocial_json_1.default.bytecode, deployer);
    const c = await (f.deploy(UnirepAddr, _postReputation, _commentReputation, _defaultAirdroppedRep, {
        gasLimit: 9000000,
    }));
    await c.deployTransaction.wait();
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
    let epochKey = maci_crypto_1.hash5(values);
    // Adjust epoch key size according to epoch tree depth
    const epochKeyModed = BigInt(epochKey.toString()) % BigInt(2 ** _epochTreeDepth);
    return epochKeyModed;
};
