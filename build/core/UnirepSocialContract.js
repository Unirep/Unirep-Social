"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnirepSocialContract = void 0;
const ethers_1 = require("ethers");
const crypto_1 = require("@unirep/crypto");
const contracts_1 = require("@unirep/contracts");
const circuits_1 = require("@unirep/circuits");
const unirep_1 = require("@unirep/unirep");
const defaults_1 = require("../cli/defaults");
const utils_1 = require("../cli/utils");
const UnirepSocial_json_1 = __importDefault(require("../artifacts/contracts/UnirepSocial.sol/UnirepSocial.json"));
/**
 * An API module of Unirep Social contracts.
 * All contract-interacting domain logic should be defined in here.
 */
class UnirepSocialContract {
    constructor(unirepSocialAddress, providerUrl) {
        this.unlock = async (eth_privkey) => {
            let ethSk;
            // The deployer's Ethereum private key
            // The user may either enter it as a command-line option or via the
            // standard input
            if (eth_privkey) {
                ethSk = eth_privkey;
            }
            else {
                ethSk = await (0, utils_1.promptPwd)('Your Ethereum private key');
            }
            if (!(0, utils_1.validateEthSk)(ethSk)) {
                console.error('Error: invalid Ethereum private key');
                return '';
            }
            if (!(await (0, utils_1.checkDeployerProviderConnection)(ethSk, this.url))) {
                console.error('Error: unable to connect to the Ethereum provider at', this.url);
                return '';
            }
            this.signer = new ethers_1.ethers.Wallet(ethSk, this.provider);
            return ethSk;
        };
        this.getUnirep = async () => {
            const unirepAddress = await this.contract.unirep();
            this.unirep = (0, contracts_1.getUnirepContract)(unirepAddress, this.provider);
            return this.unirep;
        };
        this.currentEpoch = async () => {
            var _a;
            if (this.unirep == undefined) {
                await this.getUnirep();
            }
            return (_a = this.unirep) === null || _a === void 0 ? void 0 : _a.currentEpoch();
        };
        this.attesterId = async () => {
            var _a;
            if (this.unirep == undefined) {
                await this.getUnirep();
            }
            return (_a = this.unirep) === null || _a === void 0 ? void 0 : _a.attesters(this.contract.address);
        };
        this.attestingFee = async () => {
            var _a;
            if (this.unirep == undefined) {
                await this.getUnirep();
            }
            return (_a = this.unirep) === null || _a === void 0 ? void 0 : _a.attestingFee();
        };
        this.userSignUp = async (commitment) => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            let tx;
            try {
                tx = await this.contract.userSignUp(commitment, { gasLimit: 1000000 });
            }
            catch (e) {
                console.error('Error: the transaction failed');
                if (e) {
                    console.error(e);
                }
                return tx;
            }
            return tx;
        };
        this.parseRepuationProof = (publicSignals, proof) => {
            const reputationNullifiers = publicSignals.slice(0, unirep_1.maxReputationBudget);
            const epoch = publicSignals[unirep_1.maxReputationBudget];
            const epochKey = publicSignals[unirep_1.maxReputationBudget + 1];
            const globalStatetreeRoot = publicSignals[unirep_1.maxReputationBudget + 2];
            const attesterId = publicSignals[unirep_1.maxReputationBudget + 3];
            const proveReputationAmount = publicSignals[unirep_1.maxReputationBudget + 4];
            const minRep = publicSignals[unirep_1.maxReputationBudget + 5];
            const proveGraffiti = publicSignals[unirep_1.maxReputationBudget + 6];
            const graffitiPreImage = publicSignals[unirep_1.maxReputationBudget + 7];
            return [
                reputationNullifiers,
                epoch,
                epochKey,
                globalStatetreeRoot,
                attesterId,
                proveReputationAmount,
                minRep,
                proveGraffiti,
                graffitiPreImage,
                proof
            ];
        };
        this.publishPost = async (postId, publicSignals, proof, postContent) => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            const reputationNullifiers = publicSignals.slice(0, unirep_1.maxReputationBudget);
            const epoch = publicSignals[unirep_1.maxReputationBudget];
            const epochKey = publicSignals[unirep_1.maxReputationBudget + 1];
            const globalStatetreeRoot = publicSignals[unirep_1.maxReputationBudget + 2];
            const attesterId = publicSignals[unirep_1.maxReputationBudget + 3];
            const proveReputationAmount = publicSignals[unirep_1.maxReputationBudget + 4];
            const minRep = publicSignals[unirep_1.maxReputationBudget + 5];
            const proveGraffiti = publicSignals[unirep_1.maxReputationBudget + 6];
            const graffitiPreImage = publicSignals[unirep_1.maxReputationBudget + 7];
            const proofsRelated = this.parseRepuationProof(publicSignals, proof);
            const attestingFee = await this.attestingFee();
            let tx;
            try {
                tx = await this.contract.publishPost(BigInt((0, crypto_1.add0x)(postId)), postContent, proofsRelated, { value: attestingFee, gasLimit: 1000000 });
            }
            catch (e) {
                console.error('Error: the transaction failed');
                if (e) {
                    console.error(e);
                }
                return tx;
            }
            return { tx: tx, postId: postId };
        };
        this.leaveComment = async (publicSignals, proof, postId, commentId, commentContent) => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            const reputationNullifiers = publicSignals.slice(0, unirep_1.maxReputationBudget);
            const epoch = publicSignals[unirep_1.maxReputationBudget];
            const epochKey = publicSignals[unirep_1.maxReputationBudget + 1];
            const globalStatetreeRoot = publicSignals[unirep_1.maxReputationBudget + 2];
            const attesterId = publicSignals[unirep_1.maxReputationBudget + 3];
            const proveReputationAmount = publicSignals[unirep_1.maxReputationBudget + 4];
            const minRep = publicSignals[unirep_1.maxReputationBudget + 5];
            const proveGraffiti = publicSignals[unirep_1.maxReputationBudget + 6];
            const graffitiPreImage = publicSignals[unirep_1.maxReputationBudget + 7];
            const proofsRelated = this.parseRepuationProof(publicSignals, proof);
            const attestingFee = await this.attestingFee();
            let tx;
            try {
                tx = await this.contract.leaveComment(BigInt((0, crypto_1.add0x)(postId)), BigInt((0, crypto_1.add0x)(commentId)), commentContent, proofsRelated, { value: attestingFee, gasLimit: 1000000 });
            }
            catch (e) {
                console.error('Error: the transaction failed');
                if (e) {
                    console.error(e);
                }
                return tx;
            }
            return { tx: tx, commentId: commentId };
        };
        this.vote = async (publicSignals, proof, toEpochKey, epochKeyProofIndex, upvoteValue, downvoteValue) => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            const proofsRelated = this.parseRepuationProof(publicSignals, proof);
            const attestingFee = await this.attestingFee();
            let tx;
            try {
                tx = await this.contract.vote(upvoteValue, downvoteValue, toEpochKey, epochKeyProofIndex, proofsRelated, { value: attestingFee.mul(2), gasLimit: 1000000 });
            }
            catch (e) {
                console.error('Error: the transaction failed');
                if (e) {
                    console.error(e);
                }
                return tx;
            }
            return tx;
        };
        this.getReputationProofIndex = async (publicSignals, proof) => {
            var _a, _b;
            if (this.unirep == undefined) {
                await this.getUnirep();
            }
            const proofsRelated = this.parseRepuationProof(publicSignals, proof);
            const proofNullifier = await ((_a = this.unirep) === null || _a === void 0 ? void 0 : _a.hashReputationProof(proofsRelated));
            return (_b = this.unirep) === null || _b === void 0 ? void 0 : _b.getProofIndex(proofNullifier);
        };
        this.fastForward = async () => {
            var _a;
            if (this.unirep == undefined) {
                await this.getUnirep();
            }
            const epochLength = (await ((_a = this.unirep) === null || _a === void 0 ? void 0 : _a.epochLength())).toNumber();
            await this.provider.send("evm_increaseTime", [epochLength]);
        };
        this.epochTransition = async () => {
            if (this.signer != undefined) {
                if (this.unirep != undefined) {
                    this.unirep = this.unirep.connect(this.signer);
                }
                else {
                    console.log("Error: should connect UniRep");
                    return;
                }
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            let tx;
            try {
                tx = await this.unirep.beginEpochTransition({ gasLimit: 9000000 });
            }
            catch (e) {
                console.error('Error: the transaction failed');
                if (e) {
                    console.error(e);
                }
                return tx;
            }
            return tx;
        };
        this.submitStartTransitionProof = async (startTransitionProof) => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            let tx;
            try {
                tx = await this.contract.startUserStateTransition(startTransitionProof.blindedUserState, startTransitionProof.blindedHashChain, startTransitionProof.globalStateTreeRoot, (0, circuits_1.formatProofForVerifierContract)(startTransitionProof.proof));
            }
            catch (e) {
                console.error('Error: the transaction failed');
                if (e) {
                    console.error(e);
                }
                return tx;
            }
            return tx;
        };
        this.getStartTransitionProofIndex = async (startTransitionProof) => {
            var _a, _b;
            if (this.unirep == undefined) {
                await this.getUnirep();
            }
            let proofNullifier = await ((_a = this.unirep) === null || _a === void 0 ? void 0 : _a.hashStartTransitionProof(startTransitionProof.blindedUserState, startTransitionProof.blindedHashChain, startTransitionProof.globalStateTreeRoot, (0, circuits_1.formatProofForVerifierContract)(startTransitionProof.proof)));
            return (_b = this.unirep) === null || _b === void 0 ? void 0 : _b.getProofIndex(proofNullifier);
        };
        this.submitProcessAttestationsProof = async (processAttestaitonProof) => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            let tx;
            try {
                tx = await this.contract.processAttestations(processAttestaitonProof.outputBlindedUserState, processAttestaitonProof.outputBlindedHashChain, processAttestaitonProof.inputBlindedUserState, (0, circuits_1.formatProofForVerifierContract)(processAttestaitonProof.proof));
            }
            catch (e) {
                console.error('Error: the transaction failed');
                if (e) {
                    console.error(e);
                }
                return tx;
            }
            return tx;
        };
        this.getProcessAttestationsProofIndex = async (processAttestaitonProof) => {
            var _a, _b;
            if (this.unirep == undefined) {
                await this.getUnirep();
            }
            let proofNullifier = await ((_a = this.unirep) === null || _a === void 0 ? void 0 : _a.hashProcessAttestationsProof(processAttestaitonProof.outputBlindedUserState, processAttestaitonProof.outputBlindedHashChain, processAttestaitonProof.inputBlindedUserState, (0, circuits_1.formatProofForVerifierContract)(processAttestaitonProof.proof)));
            return (_b = this.unirep) === null || _b === void 0 ? void 0 : _b.getProofIndex(proofNullifier);
        };
        this.submitUserStateTransitionProof = async (finalTransitionProof, proofIndexes) => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            let tx;
            try {
                tx = await this.contract.updateUserStateRoot([
                    finalTransitionProof.newGlobalStateTreeLeaf,
                    finalTransitionProof.epochKeyNullifiers,
                    finalTransitionProof.transitionedFromEpoch,
                    finalTransitionProof.blindedUserStates,
                    finalTransitionProof.fromGSTRoot,
                    finalTransitionProof.blindedHashChains,
                    finalTransitionProof.fromEpochTree,
                    (0, circuits_1.formatProofForVerifierContract)(finalTransitionProof.proof),
                ], proofIndexes);
            }
            catch (e) {
                console.error('Error: the transaction failed');
                if (e) {
                    console.error(e);
                }
                return tx;
            }
            return tx;
        };
        this.userStateTransition = async (results) => {
            const txList = [];
            const proofIndexes = [];
            let tx = await this.submitStartTransitionProof(results.startTransitionProof);
            txList.push(tx);
            const proofIndex = await this.getStartTransitionProofIndex(results.startTransitionProof);
            proofIndexes.push(BigInt(proofIndex));
            for (let i = 0; i < results.processAttestationProofs.length; i++) {
                tx = await this.submitProcessAttestationsProof(results.processAttestationProofs[i]);
                txList.push(tx);
                const proofIndex = await this.getProcessAttestationsProofIndex(results.processAttestationProofs[i]);
                proofIndexes.push(BigInt(proofIndex));
            }
            tx = await this.submitUserStateTransitionProof(results.finalTransitionProof, proofIndexes);
            txList.push(tx);
            return txList;
        };
        this.airdrop = async (publicSignals, proof) => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            const attestingFee = await this.attestingFee();
            const userSignUpProof = publicSignals.concat([proof]);
            let tx;
            try {
                tx = await this.contract.airdrop(userSignUpProof, { value: attestingFee, gasLimit: 1000000 });
            }
            catch (e) {
                console.error('Error: the transaction failed');
                if (e) {
                    console.error(e);
                }
                return tx;
            }
            return tx;
        };
        this.getPostEvents = async (epoch) => {
            const postFilter = this.contract.filters.PostSubmitted(epoch);
            const postEvents = await this.contract.queryFilter(postFilter);
            return postEvents;
        };
        this.verifyEpochKeyValidity = async (publicSignals, proof) => {
            var _a;
            if (this.unirep == undefined) {
                await this.getUnirep();
            }
            const globalStateTree = publicSignals[0];
            const epoch = publicSignals[1];
            const epochKey = publicSignals[2];
            const isValid = await ((_a = this.unirep) === null || _a === void 0 ? void 0 : _a.verifyEpochKeyValidity(globalStateTree, epoch, epochKey, proof));
            return isValid;
        };
        this.verifyReputation = async (publicSignals, proof) => {
            var _a;
            if (this.unirep == undefined) {
                await this.getUnirep();
            }
            const reputationNullifiers = publicSignals.slice(0, unirep_1.maxReputationBudget);
            const epoch = publicSignals[unirep_1.maxReputationBudget];
            const epochKey = publicSignals[unirep_1.maxReputationBudget + 1];
            const globalStatetreeRoot = publicSignals[unirep_1.maxReputationBudget + 2];
            const attesterId = publicSignals[unirep_1.maxReputationBudget + 3];
            const proveReputationAmount = publicSignals[unirep_1.maxReputationBudget + 4];
            const minRep = publicSignals[unirep_1.maxReputationBudget + 5];
            const proveGraffiti = publicSignals[unirep_1.maxReputationBudget + 6];
            const graffitiPreImage = publicSignals[unirep_1.maxReputationBudget + 7];
            const isValid = await ((_a = this.unirep) === null || _a === void 0 ? void 0 : _a.verifyReputation(reputationNullifiers, epoch, epochKey, globalStatetreeRoot, attesterId, proveReputationAmount, minRep, proveGraffiti, graffitiPreImage, proof));
            return isValid;
        };
        this.verifyUserSignUp = async (publicSignals, proof) => {
            var _a;
            if (this.unirep == undefined) {
                await this.getUnirep();
            }
            const epoch = publicSignals[0];
            const epochKey = publicSignals[1];
            const globalStateTreeRoot = publicSignals[2];
            const attesterId = publicSignals[3];
            const isValid = await ((_a = this.unirep) === null || _a === void 0 ? void 0 : _a.verifyUserSignUp(epoch, epochKey, globalStateTreeRoot, attesterId, proof));
            return isValid;
        };
        this.url = providerUrl ? providerUrl : defaults_1.DEFAULT_ETH_PROVIDER;
        this.provider = new ethers_1.ethers.providers.JsonRpcProvider(this.url);
        if (!(0, utils_1.validateEthAddress)(unirepSocialAddress)) {
            console.error('Error: invalid Unirep contract address');
        }
        this.contract = new ethers_1.ethers.Contract(unirepSocialAddress, UnirepSocial_json_1.default.abi, this.provider);
    }
}
exports.UnirepSocialContract = UnirepSocialContract;
