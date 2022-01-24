"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnirepSocialContract = void 0;
const ethers_1 = require("ethers");
const contracts_1 = require("@unirep/contracts");
const circuits_1 = require("@unirep/circuits");
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
            // The deployer's Ethereum private key
            const ethSk = eth_privkey;
            if (!utils_1.validateEthSk(ethSk)) {
                console.error('Error: invalid Ethereum private key');
                return '';
            }
            if (!(await utils_1.checkDeployerProviderConnection(ethSk, this.url))) {
                console.error('Error: unable to connect to the Ethereum provider at', this.url);
                return '';
            }
            this.signer = new ethers_1.ethers.Wallet(ethSk, this.provider);
            return ethSk;
        };
        this.getUnirep = async () => {
            const unirepAddress = await this.contract.unirep();
            this.unirep = contracts_1.getUnirepContract(unirepAddress, this.provider);
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
        // public userSignUpWithProof = async (publicSignals: any, proof: any): Promise<any> => {
        //     if(this.signer != undefined){
        //         this.contract = this.contract.connect(this.signer)
        //     }
        //     else{
        //         console.log("Error: should connect a signer")
        //         return
        //     }
        //     const attestingFee = await this.attestingFee()
        //     const userSignUpProof = publicSignals.concat([proof])
        //     let tx
        //     try {
        //         tx = await this.contract.userSignUpWithProof(
        //             userSignUpProof,
        //             { value: attestingFee, gasLimit: 1000000 }
        //         )
        //     } catch(e) {
        //         console.error('Error: the transaction failed')
        //         if (e) {
        //             console.error(e)
        //         }
        //         return tx
        //     }
        //     return tx
        // }
        this.publishPost = async (reputationProof, postContent) => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            const attestingFee = await this.attestingFee();
            return this.contract.publishPost(postContent, reputationProof, { value: attestingFee, gasLimit: 1000000 });
        };
        this.leaveComment = async (reputationProof, postId, commentContent) => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            const attestingFee = await this.attestingFee();
            return this.contract.leaveComment(postId, commentContent, reputationProof, { value: attestingFee, gasLimit: 1000000 });
        };
        this.vote = async (reputationProof, toEpochKey, epochKeyProofIndex, upvoteValue, downvoteValue) => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            const attestingFee = await this.attestingFee();
            return this.contract.vote(upvoteValue, downvoteValue, toEpochKey, epochKeyProofIndex, reputationProof, { value: attestingFee.mul(2), gasLimit: 1000000 });
        };
        this.getReputationProofIndex = async (reputationProof) => {
            var _a;
            if (this.unirep == undefined) {
                await this.getUnirep();
            }
            return (_a = this.unirep) === null || _a === void 0 ? void 0 : _a.getProofIndex(reputationProof.hash());
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
            return this.unirep.beginEpochTransition({ gasLimit: 9000000 });
        };
        this.submitStartTransitionProof = async (startTransitionProof) => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            return this.contract.startUserStateTransition(startTransitionProof.blindedUserState, startTransitionProof.blindedHashChain, startTransitionProof.globalStateTreeRoot, circuits_1.formatProofForVerifierContract(startTransitionProof.proof));
        };
        this.getStartTransitionProofIndex = async (startTransitionProof) => {
            var _a;
            if (this.unirep == undefined) {
                await this.getUnirep();
            }
            const proofNullifier = contracts_1.computeStartTransitionProofHash(startTransitionProof.blindedUserState, startTransitionProof.blindedHashChain, startTransitionProof.globalStateTreeRoot, circuits_1.formatProofForVerifierContract(startTransitionProof.proof));
            return (_a = this.unirep) === null || _a === void 0 ? void 0 : _a.getProofIndex(proofNullifier);
        };
        this.submitProcessAttestationsProof = async (processAttestaitonProof) => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            return this.contract.processAttestations(processAttestaitonProof.outputBlindedUserState, processAttestaitonProof.outputBlindedHashChain, processAttestaitonProof.inputBlindedUserState, circuits_1.formatProofForVerifierContract(processAttestaitonProof.proof));
        };
        this.getProcessAttestationsProofIndex = async (processAttestaitonProof) => {
            var _a;
            if (this.unirep == undefined) {
                await this.getUnirep();
            }
            const proofNullifier = contracts_1.computeProcessAttestationsProofHash(processAttestaitonProof.outputBlindedUserState, processAttestaitonProof.outputBlindedHashChain, processAttestaitonProof.inputBlindedUserState, circuits_1.formatProofForVerifierContract(processAttestaitonProof.proof));
            return (_a = this.unirep) === null || _a === void 0 ? void 0 : _a.getProofIndex(proofNullifier);
        };
        this.submitUserStateTransitionProof = async (USTProof, proofIndexes) => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            return this.contract.updateUserStateRoot(USTProof, proofIndexes);
        };
        this.userStateTransition = async (results) => {
            const txList = [];
            const proofIndexes = [];
            let tx = await this.submitStartTransitionProof(results.startTransitionProof);
            txList.push(tx);
            await tx.wait();
            for (let i = 0; i < results.processAttestationProofs.length; i++) {
                tx = await this.submitProcessAttestationsProof(results.processAttestationProofs[i]);
                txList.push(tx);
                await tx.wait();
            }
            const proofIndex = await this.getStartTransitionProofIndex(results.startTransitionProof);
            proofIndexes.push(BigInt(proofIndex));
            for (let i = 0; i < results.processAttestationProofs.length; i++) {
                const proofIndex = await this.getProcessAttestationsProofIndex(results.processAttestationProofs[i]);
                proofIndexes.push(BigInt(proofIndex));
            }
            const USTProof = new contracts_1.UserTransitionProof(results.finalTransitionProof.publicSignals, results.finalTransitionProof.proof);
            tx = await this.submitUserStateTransitionProof(USTProof, proofIndexes);
            txList.push(tx);
            await tx.wait();
            return txList;
        };
        this.airdrop = async (signUpProof) => {
            if (this.signer != undefined) {
                this.contract = this.contract.connect(this.signer);
            }
            else {
                console.log("Error: should connect a signer");
                return;
            }
            const attestingFee = await this.attestingFee();
            return this.contract.airdrop(signUpProof, { value: attestingFee, gasLimit: 1000000 });
        };
        this.getPostEvents = async (epoch) => {
            const postFilter = this.contract.filters.PostSubmitted(epoch);
            const postEvents = await this.contract.queryFilter(postFilter);
            return postEvents;
        };
        this.verifyEpochKeyValidity = async (epochKeyProof) => {
            var _a;
            if (this.unirep == undefined) {
                await this.getUnirep();
            }
            const isValid = await ((_a = this.unirep) === null || _a === void 0 ? void 0 : _a.verifyEpochKeyValidity(epochKeyProof));
            return isValid;
        };
        this.verifyReputation = async (reputationProof) => {
            var _a;
            if (this.unirep == undefined) {
                await this.getUnirep();
            }
            const isValid = await ((_a = this.unirep) === null || _a === void 0 ? void 0 : _a.verifyReputation(reputationProof));
            return isValid;
        };
        this.verifyUserSignUp = async (signUpProof) => {
            var _a;
            if (this.unirep == undefined) {
                await this.getUnirep();
            }
            const isValid = await ((_a = this.unirep) === null || _a === void 0 ? void 0 : _a.verifyUserSignUp(signUpProof));
            return isValid;
        };
        this.url = providerUrl ? providerUrl : defaults_1.DEFAULT_ETH_PROVIDER;
        this.provider = new ethers_1.ethers.providers.JsonRpcProvider(this.url);
        if (!utils_1.validateEthAddress(unirepSocialAddress)) {
            console.error('Error: invalid Unirep contract address');
        }
        this.contract = new ethers_1.ethers.Contract(unirepSocialAddress, UnirepSocial_json_1.default.abi, this.provider);
    }
}
exports.UnirepSocialContract = UnirepSocialContract;
