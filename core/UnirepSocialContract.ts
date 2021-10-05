import { ethers } from 'ethers';
import { add0x } from '@unirep/crypto';
import { getUnirepContract } from '@unirep/contracts'
import { formatProofForVerifierContract } from '@unirep/circuits'

import { DEFAULT_ETH_PROVIDER, } from '../cli/defaults';
import { checkDeployerProviderConnection, promptPwd, validateEthAddress, validateEthSk } from '../cli/utils';
import UnirepSocial from "../artifacts/contracts/UnirepSocial.sol/UnirepSocial.json"
import Post, { IPost } from "../database/models/post";
import Comment, { IComment } from '../database/models/comment';

/**
 * An API module of Unirep Social contracts.
 * All contract-interacting domain logic should be defined in here.
 */
export class UnirepSocialContract {
    url: string;
    provider: ethers.providers.JsonRpcProvider;
    signer?: ethers.Signer;
    
    // Unirep Social contract
    contract: ethers.Contract;

    // Unirep contract
    unirep?: ethers.Contract;

    constructor(unirepSocialAddress?, providerUrl?) {
        this.url = providerUrl? providerUrl : DEFAULT_ETH_PROVIDER;
        this.provider = new ethers.providers.JsonRpcProvider(this.url)
         if (!validateEthAddress(unirepSocialAddress)) {
            console.error('Error: invalid Unirep contract address')
        }
        this.contract = new ethers.Contract(
            unirepSocialAddress,
            UnirepSocial.abi,
            this.provider,
        )
    }

    async unlock(eth_privkey?: string): Promise<string> {
        let ethSk
        // The deployer's Ethereum private key
        // The user may either enter it as a command-line option or via the
        // standard input
        if (eth_privkey) {
            ethSk = eth_privkey
        } else {
            ethSk = await promptPwd('Your Ethereum private key')
        }

        if (!validateEthSk(ethSk)) {
            console.error('Error: invalid Ethereum private key')
            return ''
        }

        if (! (await checkDeployerProviderConnection(ethSk, this.url))) {
            console.error('Error: unable to connect to the Ethereum provider at', this.url)
            return ''
        }
        this.signer = new ethers.Wallet(ethSk, this.provider)
        return ethSk
    }

    async getUnirep(): Promise<any> {
        const unirepAddress = await this.contract.unirep()
        this.unirep = getUnirepContract(unirepAddress, this.provider)
        return this.unirep
    }

    async currentEpoch(): Promise<any> {
        if(this.unirep == undefined){
            await this.getUnirep()
        }
        return this.unirep?.currentEpoch()
    }

    async attesterId(): Promise<any> {
        if(this.unirep == undefined){
            await this.getUnirep()
        }
        return this.unirep?.attesters(this.contract.address)
    }

    async attestingFee(): Promise<any> {
        if(this.unirep == undefined){
            await this.getUnirep()
        }
        return this.unirep?.attestingFee()
    }

    async userSignUp(commitment: string): Promise<any> {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        let tx
        try {
            tx = await this.contract.userSignUp(
                commitment,
                { gasLimit: 1000000 }
            )
    
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
            return tx
        }
        return tx
    }

    async publishPost(results: any, postContent: string): Promise<any> {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }

        const newpost: IPost = new Post({
            content: postContent,
            // TODO: hashedContent
            epochKey: results.epochKey,
            epkProof: formatProofForVerifierContract(results.proof).map((n)=>add0x(BigInt(n).toString(16))),
            proveMinRep: results.minRep != null ? true : false,
            minRep: Number(results.minRep),
            comments: [],
            status: 0
        });

        const publicSignals = [
            results.epochKey,
            results.globalStatetreeRoot,
            results.attesterId,
            results.proveReputationAmount,
            results.minRep,
            results.proveGraffiti,
            results.graffitiPreImage,
            formatProofForVerifierContract(results.proof)
        ]
        const attestingFee = await this.attestingFee()

        let tx
        try {
            tx = await this.contract.publishPost(
                BigInt(add0x(newpost._id.toString())), 
                postContent, 
                results.reputationNullifiers,
                publicSignals,
                { value: attestingFee, gasLimit: 1000000 }
            )
    
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
            return tx
        }
        return { tx: tx,  postId: newpost._id.toString() }
    }

    async leaveComment(results: any, postId: string, commentContent: string): Promise<any> {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }

        const publicSignals = [
            results.epochKey,
            results.globalStatetreeRoot,
            results.attesterId,
            results.proveReputationAmount,
            results.minRep,
            results.proveGraffiti,
            results.graffitiPreImage,
            formatProofForVerifierContract(results.proof)
        ]
        const attestingFee = await this.attestingFee()

        const newComment: IComment = new Comment({
            content: commentContent,
            // TODO: hashedContent
            epochKey: results.epochKey,
            epkProof: formatProofForVerifierContract(results.proof).map((n)=>add0x(BigInt(n).toString(16))),
            proveMinRep: results.minRep != null ? true : false,
            minRep: Number(results.minRep),
            status: 0
        });

        let tx
        try {
            tx = await this.contract.leaveComment(
                BigInt(add0x(postId)), 
                BigInt(add0x(newComment._id.toString())), 
                commentContent, 
                results.reputationNullifiers,
                publicSignals,
                { value: attestingFee, gasLimit: 1000000 }
            )
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
    
            // if (args.from_database){
            //     const db = await mongoose.connect(
            //         dbUri, 
            //         { useNewUrlParser: true, 
            //           useFindAndModify: false, 
            //           useUnifiedTopology: true
            //         }
            //     )
            //     const res = await Post.deleteOne({ "comments._id": newComment._id })
            //     console.log(res)
            //     db.disconnect();
            // }
            return tx
        }
        return { tx: tx,  commentId: newComment._id.toString() }
    }

    async vote(results: any, toEpochKey: BigInt | string, upvoteValue: number, downvoteValue: number): Promise<any> {

        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        const proofsRelated = [
            results.epochKey,
            results.globalStatetreeRoot,
            results.attesterId,
            results.proveReputationAmount,
            results.minRep,
            results.proveGraffiti,
            results.graffitiPreImage,
            formatProofForVerifierContract(results.proof)
        ]
        const attestingFee = await this.attestingFee()

        let tx
        try {
            tx = await this.contract.vote(
                upvoteValue,
                downvoteValue,
                toEpochKey,
                results.reputationNullifiers,
                proofsRelated,
                { value: attestingFee.mul(2), gasLimit: 1000000 }
            )
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
            return tx
        }
        return tx
    }

    async fastForward() {
        if(this.unirep == undefined){
            await this.getUnirep()
        }
        const epochLength = (await this.unirep?.epochLength()).toNumber()
        await this.provider.send("evm_increaseTime", [epochLength])
    }

    async epochTransition(): Promise<any> {
        if(this.signer != undefined){
            if(this.unirep != undefined){
                this.unirep = this.unirep.connect(this.signer)
            }
            else {
                console.log("Error: should connect UniRep")
                return
            }
        }
        else{
            console.log("Error: should connect a signer")
            return
        }

        const currentEpoch = await this.currentEpoch()
        let tx
        try {
            const numEpochKeysToSeal = await this.unirep.getNumEpochKey(currentEpoch)
            tx = await this.unirep.beginEpochTransition(
                numEpochKeysToSeal,
                { gasLimit: 9000000 }
            )
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
            return tx
        }
        return tx
    }

    async submitStartTransitionProof(startTransitionProof: any): Promise<any> {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }

        let tx
        try {
            tx = await this.contract.startUserStateTransition(
                startTransitionProof.blindedUserState,
                startTransitionProof.blindedHashChain,
                startTransitionProof.globalStateTreeRoot,
                formatProofForVerifierContract(startTransitionProof.proof),
            )
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
            return tx
        }
        return tx
    }

    async submitProcessAttestationProof(processAttestaitonProof: any): Promise<any> {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }

        let tx
        try {
            tx = await this.contract.processAttestations(
                processAttestaitonProof.outputBlindedUserState,
                processAttestaitonProof.outputBlindedHashChain,
                processAttestaitonProof.inputBlindedUserState,
                formatProofForVerifierContract(processAttestaitonProof.proof),
            )
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
            return tx
        }
        return tx
    }

    async submitUserStateTransitionProof(finalTransitionProof: any): Promise<any> {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }

        let tx
        try {
            tx = await this.contract.updateUserStateRoot(
                finalTransitionProof.newGlobalStateTreeLeaf,
                finalTransitionProof.epochKeyNullifiers,
                finalTransitionProof.blindedUserStates,
                finalTransitionProof.blindedHashChains,
                finalTransitionProof.transitionedFromEpoch,
                finalTransitionProof.fromGSTRoot,
                finalTransitionProof.fromEpochTree,
                formatProofForVerifierContract(finalTransitionProof.proof),
            )
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
            return tx
        }
        return tx
    }

    async userStateTransition(results: any): Promise<any> {
        const txList: any[] = []
        let tx = await this.submitStartTransitionProof(results.startTransitionProof)
        txList.push(tx)

        for (let i = 0; i < results.processAttestationProofs.length; i++) {
            tx = await this.submitProcessAttestationProof(results.processAttestationProofs[i])
            txList.push(tx)
        }

        tx = await this.submitUserStateTransitionProof(results.finalTransitionProof)
        txList.push(tx)
        return txList
    }

    async airdrop(epochKey: string | BigInt): Promise<any> {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        const attestingFee = await this.attestingFee()

        let tx
        try {
            tx = await this.contract.airdrop(
                epochKey,
                { value: attestingFee, gasLimit: 1000000 }
            )
    
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
            return tx
        }
        return tx
    }

    async getPostEvents(epoch?: number): Promise<any> {
        const postFilter = this.contract.filters.PostSubmitted(epoch)
        const postEvents = await this.contract.queryFilter(postFilter)
        return postEvents
    }
}