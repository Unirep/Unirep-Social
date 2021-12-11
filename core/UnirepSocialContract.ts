import { ethers } from 'ethers';
import { add0x } from '@unirep/crypto';
import { getUnirepContract } from '@unirep/contracts'
import { formatProofForVerifierContract } from '@unirep/circuits'
import { maxReputationBudget } from '@unirep/unirep'

import { DEFAULT_ETH_PROVIDER, } from '../cli/defaults';
import { checkDeployerProviderConnection, validateEthAddress, validateEthSk } from '../cli/utils';
import UnirepSocial from "../artifacts/contracts/UnirepSocial.sol/UnirepSocial.json"

/**
 * An API module of Unirep Social contracts.
 * All contract-interacting domain logic should be defined in here.
 */
export class UnirepSocialContract {
    private url: string;
    private provider: ethers.providers.JsonRpcProvider;
    private signer?: ethers.Signer;
    
    // Unirep Social contract
    private contract: ethers.Contract;

    // Unirep contract
    public unirep?: ethers.Contract;

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

    public unlock = async (eth_privkey: string): Promise<string> => {
        // The deployer's Ethereum private key
        const ethSk = eth_privkey
        
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

    public getUnirep = async (): Promise<any> => {
        const unirepAddress = await this.contract.unirep()
        this.unirep = getUnirepContract(unirepAddress, this.provider)
        return this.unirep
    }

    public currentEpoch = async (): Promise<any> => {
        if(this.unirep == undefined){
            await this.getUnirep()
        }
        return this.unirep?.currentEpoch()
    }

    public attesterId = async (): Promise<any> => {
        if(this.unirep == undefined){
            await this.getUnirep()
        }
        return this.unirep?.attesters(this.contract.address)
    }

    public attestingFee = async (): Promise<any> => {
        if(this.unirep == undefined){
            await this.getUnirep()
        }
        return this.unirep?.attestingFee()
    }

    public userSignUp = async (commitment: string): Promise<any> => {
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

    private parseRepuationProof = (publicSignals: any, proof: any) => {
        const reputationNullifiers = publicSignals.slice(0, maxReputationBudget)
        const epoch = publicSignals[maxReputationBudget]
        const epochKey = publicSignals[maxReputationBudget + 1]
        const globalStatetreeRoot = publicSignals[maxReputationBudget + 2]
        const attesterId = publicSignals[maxReputationBudget + 3]
        const proveReputationAmount = publicSignals[maxReputationBudget + 4]
        const minRep = publicSignals[maxReputationBudget + 5]
        const proveGraffiti = publicSignals[maxReputationBudget + 6]
        const graffitiPreImage = publicSignals[maxReputationBudget + 7]

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
        ]
    }

    public publishPost = async (postId: string, publicSignals: any, proof: any, postContent: string): Promise<any> => {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }

        const proofsRelated = this.parseRepuationProof(publicSignals, proof)
        const attestingFee = await this.attestingFee()

        let tx
        try {
            tx = await this.contract.publishPost(
                BigInt(add0x(postId)), 
                postContent, 
                proofsRelated,
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

    public leaveComment = async (publicSignals: any, proof: any, postId: string, commentId: string, commentContent: string): Promise<any> => {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }

        const proofsRelated = this.parseRepuationProof(publicSignals, proof)
        const attestingFee = await this.attestingFee()

        let tx
        try {
            tx = await this.contract.leaveComment(
                BigInt(add0x(postId)), 
                BigInt(add0x(commentId)), 
                commentContent, 
                proofsRelated,
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

    public vote = async (publicSignals: any, proof: any, toEpochKey: BigInt | string, epochKeyProofIndex: BigInt | number, upvoteValue: number, downvoteValue: number): Promise<any> => {

        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        const proofsRelated = this.parseRepuationProof(publicSignals, proof)
        const attestingFee = await this.attestingFee()

        let tx
        try {
            tx = await this.contract.vote(
                upvoteValue,
                downvoteValue,
                toEpochKey,
                epochKeyProofIndex,
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

    public getReputationProofIndex = async (publicSignals: any, proof: any) => {
        if(this.unirep == undefined){
            await this.getUnirep()
        }
        const proofsRelated = this.parseRepuationProof(publicSignals, proof)
        const proofNullifier = await this.unirep?.hashReputationProof(proofsRelated)
        return this.unirep?.getProofIndex(proofNullifier)
    }

    public fastForward = async () => {
        if(this.unirep == undefined){
            await this.getUnirep()
        }
        const epochLength = (await this.unirep?.epochLength()).toNumber()
        await this.provider.send("evm_increaseTime", [epochLength])
    }

    public epochTransition = async (): Promise<any> => {
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

        let tx
        try {
            tx = await this.unirep.beginEpochTransition({ gasLimit: 9000000 })
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
            return tx
        }
        return tx
    }

    private submitStartTransitionProof = async (startTransitionProof: any): Promise<any> => {
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

    public getStartTransitionProofIndex = async (startTransitionProof: any): Promise<any> => {
        if(this.unirep == undefined){
            await this.getUnirep()
        }
        let proofNullifier = await this.unirep?.hashStartTransitionProof(
            startTransitionProof.blindedUserState,
            startTransitionProof.blindedHashChain,
            startTransitionProof.globalStateTreeRoot,
            formatProofForVerifierContract(startTransitionProof.proof),
        )
        return this.unirep?.getProofIndex(proofNullifier)
    }

    private submitProcessAttestationsProof = async (processAttestaitonProof: any): Promise<any> => {
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

    public getProcessAttestationsProofIndex = async (processAttestaitonProof: any): Promise<any> => {
        if(this.unirep == undefined){
            await this.getUnirep()
        }
        let proofNullifier = await this.unirep?.hashProcessAttestationsProof(
            processAttestaitonProof.outputBlindedUserState,
            processAttestaitonProof.outputBlindedHashChain,
            processAttestaitonProof.inputBlindedUserState,
            formatProofForVerifierContract(processAttestaitonProof.proof),
        )
        return this.unirep?.getProofIndex(proofNullifier)
    }

    private submitUserStateTransitionProof = async (finalTransitionProof: any, proofIndexes: BigInt[]): Promise<any> => {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }

        let tx
        try {
            tx = await this.contract.updateUserStateRoot([
                finalTransitionProof.newGlobalStateTreeLeaf,
                finalTransitionProof.epochKeyNullifiers,
                finalTransitionProof.transitionedFromEpoch,
                finalTransitionProof.blindedUserStates,
                finalTransitionProof.fromGSTRoot,
                finalTransitionProof.blindedHashChains,
                finalTransitionProof.fromEpochTree,
                formatProofForVerifierContract(finalTransitionProof.proof),
            ], proofIndexes)
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
            return tx
        }
        return tx
    }

    public userStateTransition = async (results: any): Promise<any> => {
        const txList: any[] = []
        const proofIndexes: BigInt[] = []
        let tx = await this.submitStartTransitionProof(results.startTransitionProof)
        txList.push(tx)
        await tx.wait()

        for (let i = 0; i < results.processAttestationProofs.length; i++) {
            tx = await this.submitProcessAttestationsProof(results.processAttestationProofs[i])
            txList.push(tx)
            await tx.wait()
        }
        const proofIndex = await this.getStartTransitionProofIndex(results.startTransitionProof)
        proofIndexes.push(BigInt(proofIndex))
        for (let i = 0; i < results.processAttestationProofs.length; i++) {
            const proofIndex = await this.getProcessAttestationsProofIndex(results.processAttestationProofs[i])
            proofIndexes.push(BigInt(proofIndex))
        }
        tx = await this.submitUserStateTransitionProof(results.finalTransitionProof, proofIndexes)
        txList.push(tx)
        await tx.wait()
        return txList
    }

    public airdrop = async (publicSignals: any, proof: any): Promise<any> => {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        const attestingFee = await this.attestingFee()
        const userSignUpProof = publicSignals.concat([proof])

        let tx
        try {
            tx = await this.contract.airdrop(
                userSignUpProof,
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

    public getPostEvents = async (epoch?: number): Promise<any> => {
        const postFilter = this.contract.filters.PostSubmitted(epoch)
        const postEvents = await this.contract.queryFilter(postFilter)
        return postEvents
    }

    public verifyEpochKeyValidity = async (publicSignals: any, proof: any): Promise<boolean> => {
        if(this.unirep == undefined){
            await this.getUnirep()
        }
        const globalStateTree = publicSignals[0]
        const epoch = publicSignals[1]
        const epochKey = publicSignals[2]
        const isValid = await this.unirep?.verifyEpochKeyValidity(
            globalStateTree,
            epoch,
            epochKey,
            proof,
        )
        return isValid
    }

    public verifyReputation = async (publicSignals: any, proof: any): Promise<boolean> => {
        if(this.unirep == undefined){
            await this.getUnirep()
        }
        const reputationNullifiers = publicSignals.slice(0, maxReputationBudget)
        const epoch = publicSignals[maxReputationBudget]
        const epochKey = publicSignals[maxReputationBudget + 1]
        const globalStatetreeRoot = publicSignals[maxReputationBudget + 2]
        const attesterId = publicSignals[maxReputationBudget + 3]
        const proveReputationAmount = publicSignals[maxReputationBudget + 4]
        const minRep = publicSignals[maxReputationBudget + 5]
        const proveGraffiti = publicSignals[maxReputationBudget + 6]
        const graffitiPreImage = publicSignals[maxReputationBudget + 7]

        const isValid = await this.unirep?.verifyReputation(
            reputationNullifiers,
            epoch,
            epochKey,
            globalStatetreeRoot,
            attesterId,
            proveReputationAmount,
            minRep,
            proveGraffiti,
            graffitiPreImage,
            proof,
        )
        return isValid
    }

    public verifyUserSignUp = async (publicSignals: any, proof: any): Promise<boolean> => {
        if(this.unirep == undefined){
            await this.getUnirep()
        }
        const epoch = publicSignals[0]
        const epochKey = publicSignals[1]
        const globalStateTreeRoot = publicSignals[2]
        const attesterId = publicSignals[3]
        const userHasSignedUp = publicSignals[4]
        const isValid = await this.unirep?.verifyUserSignUp(
            epoch,
            epochKey,
            globalStateTreeRoot,
            attesterId,
            userHasSignedUp,
            proof,
        )
        return isValid
    }
}