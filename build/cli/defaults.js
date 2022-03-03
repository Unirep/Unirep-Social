"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TREE_DEPTHS_CONFIG = exports.DEFAULT_ATTESTING_FEE = exports.DEFAULT_EPOCH_LENGTH = exports.DEFAULT_MAX_EPOCH_KEY_NONCE = exports.DEFAULT_ETH_PROVIDER = exports.DEFAULT_PRIVATE_KEY = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const unirep_1 = require("@unirep/unirep");
dotenv_1.default.config({
    path: '.env'
});
// const DEFAULT_ETH_PROVIDER = `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`
const DEFAULT_PRIVATE_KEY = process.env.PRIVATE_KEY;
exports.DEFAULT_PRIVATE_KEY = DEFAULT_PRIVATE_KEY;
const DEFAULT_ETH_PROVIDER = "ws://localhost:8545";
exports.DEFAULT_ETH_PROVIDER = DEFAULT_ETH_PROVIDER;
const DEFAULT_MAX_EPOCH_KEY_NONCE = unirep_1.numEpochKeyNoncePerEpoch;
exports.DEFAULT_MAX_EPOCH_KEY_NONCE = DEFAULT_MAX_EPOCH_KEY_NONCE;
const DEFAULT_EPOCH_LENGTH = unirep_1.epochLength;
exports.DEFAULT_EPOCH_LENGTH = DEFAULT_EPOCH_LENGTH;
const DEFAULT_ATTESTING_FEE = unirep_1.attestingFee;
exports.DEFAULT_ATTESTING_FEE = DEFAULT_ATTESTING_FEE;
const DEFAULT_TREE_DEPTHS_CONFIG = 'circuit';
exports.DEFAULT_TREE_DEPTHS_CONFIG = DEFAULT_TREE_DEPTHS_CONFIG;
