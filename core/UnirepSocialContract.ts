import { ethers } from 'ethers';
import { add0x } from '@unirep/crypto';
import { computeProcessAttestationsProofHash, computeStartTransitionProofHash, EpochKeyProof, getUnirepContract, ReputationProof, SignUpProof, UserTransitionProof } from '@unirep/contracts'
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

    public publishPost = async (reputationProof: ReputationProof, postContent: string): Promise<any> => {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }

        const attestingFee = await this.attestingFee()

        return this.contract.publishPost(
            postContent, 
            reputationProof,
            { value: attestingFee, gasLimit: 1000000 }
        )
    }

    public leaveComment = async (reputationProof: ReputationProof, commentContent: string): Promise<any> => {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }

        const attestingFee = await this.attestingFee()

        return this.contract.leaveComment(
            commentContent, 
            reputationProof,
            { value: attestingFee, gasLimit: 1000000 }
        )
    }

    public vote = async (
        reputationProof: ReputationProof, 
        toEpochKey: BigInt | string, 
        epochKeyProofIndex: BigInt | number, 
        upvoteValue: number, 
        downvoteValue: number
    ): Promise<any> => {

        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        const attestingFee = await this.attestingFee()

        return this.contract.vote(
            upvoteValue,
            downvoteValue,
            toEpochKey,
            epochKeyProofIndex,
            reputationProof,
            { value: attestingFee.mul(2), gasLimit: 1000000 }
        )
    }

    public getReputationProofIndex = async (reputationProof: ReputationProof) => {
        if(this.unirep == undefined){
            await this.getUnirep()
        }
        return this.unirep?.getProofIndex(reputationProof.hash())
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

        return this.unirep.beginEpochTransition({ gasLimit: 9000000 })
    }

    private submitStartTransitionProof = async (startTransitionProof: any): Promise<any> => {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }

        return this.contract.startUserStateTransition(
            startTransitionProof.blindedUserState,
            startTransitionProof.blindedHashChain,
            startTransitionProof.globalStateTreeRoot,
            formatProofForVerifierContract(startTransitionProof.proof),
        )
    }

    public getStartTransitionProofIndex = async (startTransitionProof: any): Promise<any> => {
        if(this.unirep == undefined){
            await this.getUnirep()
        }
        const proofNullifier = computeStartTransitionProofHash(
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

        return this.contract.processAttestations(
            processAttestaitonProof.outputBlindedUserState,
            processAttestaitonProof.outputBlindedHashChain,
            processAttestaitonProof.inputBlindedUserState,
            formatProofForVerifierContract(processAttestaitonProof.proof),
        )
    }

    public getProcessAttestationsProofIndex = async (processAttestaitonProof: any): Promise<any> => {
        if(this.unirep == undefined){
            await this.getUnirep()
        }
        const proofNullifier = computeProcessAttestationsProofHash(
            processAttestaitonProof.outputBlindedUserState,
            processAttestaitonProof.outputBlindedHashChain,
            processAttestaitonProof.inputBlindedUserState,
            formatProofForVerifierContract(processAttestaitonProof.proof),
        )
        return this.unirep?.getProofIndex(proofNullifier)
    }

    private submitUserStateTransitionProof = async (USTProof: UserTransitionProof, proofIndexes: BigInt[]): Promise<any> => {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }

        return this.contract.updateUserStateRoot(USTProof, proofIndexes)
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
        const USTProof = new UserTransitionProof(
            results.finalTransitionProof.publicSignals,
            results.finalTransitionProof.proof
        )
        tx = await this.submitUserStateTransitionProof(USTProof, proofIndexes)
        txList.push(tx)
        await tx.wait()
        return txList
    }

    public airdrop = async (signUpProof: SignUpProof): Promise<any> => {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        const attestingFee = await this.attestingFee()

        return this.contract.airdrop(
            signUpProof,
            { value: attestingFee, gasLimit: 1000000 }
        )
    }

    public getPostEvents = async (epoch?: number): Promise<any> => {
        const postFilter = this.contract.filters.PostSubmitted(epoch)
        const postEvents = await this.contract.queryFilter(postFilter)
        return postEvents
    }

    public verifyEpochKeyValidity = async (epochKeyProof: EpochKeyProof): Promise<boolean> => {
        if(this.unirep == undefined){
            await this.getUnirep()
        }
        const isValid = await this.unirep?.verifyEpochKeyValidity(epochKeyProof)
        return isValid
    }

    public verifyReputation = async (reputationProof: ReputationProof): Promise<boolean> => {
        if(this.unirep == undefined){
            await this.getUnirep()
        }

        const isValid = await this.unirep?.verifyReputation(reputationProof)
        return isValid
    }

    public verifyUserSignUp = async (signUpProof: SignUpProof): Promise<boolean> => {
        if(this.unirep == undefined){
            await this.getUnirep()
        }
        const isValid = await this.unirep?.verifyUserSignUp(signUpProof)
        return isValid
    }
}