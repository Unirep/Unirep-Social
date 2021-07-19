import mongoose from 'mongoose'

import GSTLeaves, { IGSTLeaf, IGSTLeaves } from '../database/models/GSTLeaf'
import EpochTreeLeaves, { IEpochTreeLeaf, IEpochTreeLeaves } from '../database/models/epochTreeLeaf'
import NullifierTreeLeaves, { INullifierTreeLeaves } from '../database/models/nullifierTreeLeaf'
import ReputationNullifier, { IReputationNullifier } from "../database/models/reputationNullifier";
import Attestations, { IAttestation } from './models/attestation'
import UserSignUp, { IUserSignUp } from './models/userSignUp'
import Settings, { ISettings } from './models/settings'
import { hash5, IncrementalQuinTree } from 'maci-crypto'
import { ethers } from 'ethers'
import { computeEmptyUserStateRoot, genNewSMT, SMT_ONE_LEAF, SMT_ZERO_LEAF } from '../core/utils'
import { epochTreeDepth, globalStateTreeDepth, nullifierTreeDepth, numAttestationsPerEpochKey, numEpochKeyNoncePerEpoch, userStateTreeDepth } from '../config/testLocal'
import { add0x, SparseMerkleTreeImpl } from '../crypto/SMT'
import { DEFAULT_START_BLOCK } from '../cli/defaults'
import Unirep from "../artifacts/contracts/Unirep.sol/Unirep.json"
import UserTransitionedState, { IUserTransitionedState } from './models/userTransitionedState'
import assert from 'assert'

class UnirepState {
    private uri: string
    private db: any
    public globalStateTreeDepth: number
    public userStateTreeDepth: number
    public epochTreeDepth: number
    public nullifierTreeDepth: number
    public numEpochKeyNoncePerEpoch: number
    public numAttestationsPerEpochKey: number
    public defaultGSTLeaf: BigInt
    public currentEpoch: number

    constructor(
       dbUri: string,
    ) {
        this.uri = dbUri
        this.globalStateTreeDepth = globalStateTreeDepth
        this.userStateTreeDepth = userStateTreeDepth
        this.epochTreeDepth = epochTreeDepth
        this.nullifierTreeDepth = nullifierTreeDepth
        this.numEpochKeyNoncePerEpoch = numEpochKeyNoncePerEpoch
        this.numAttestationsPerEpochKey = numAttestationsPerEpochKey
        this.currentEpoch = 1
        const emptyUserStateRoot = computeEmptyUserStateRoot(ethers.BigNumber.from(userStateTreeDepth).toNumber())
        this.defaultGSTLeaf = hash5([
            BigInt(0),           // zero identityCommitment
            emptyUserStateRoot,  // zero user state root
            BigInt(0),           // default airdropped karma
            BigInt(0),           // default negative karma
            BigInt(0)
        ])
    }
    
    public connectDB = async () => {
        this.db = await mongoose.connect(
            this.uri, 
             { useNewUrlParser: true, 
               useFindAndModify: false, 
               useUnifiedTopology: true
             }
         )
    }

    public initDB = async () => {
        const deletedDB = await this.db.connection.db.dropDatabase()
        return deletedDB
    }

    public saveSettings = async(unirepContract: ethers.Contract) => {
        let settings
        const existedSettings = await Settings.findOne()
        if(existedSettings == null){

            const treeDepths_ = await unirepContract.treeDepths()
            const globalStateTreeDepth = treeDepths_.globalStateTreeDepth
            const userStateTreeDepth = treeDepths_.userStateTreeDepth
            const epochTreeDepth = treeDepths_.epochTreeDepth
            const nullifierTreeDepth = treeDepths_.nullifierTreeDepth
            const attestingFee = await unirepContract.attestingFee()
            const epochLength = await unirepContract.epochLength()
            const numEpochKeyNoncePerEpoch = await unirepContract.numEpochKeyNoncePerEpoch()
            const numAttestationsPerEpochKey = await unirepContract.numAttestationsPerEpochKey()
            const currentEpoch = await unirepContract.currentEpoch()
            
            settings = new Settings({
                globalStateTreeDepth: ethers.BigNumber.from(globalStateTreeDepth).toNumber(),
	            userStateTreeDepth: ethers.BigNumber.from(userStateTreeDepth).toNumber(),
	            epochTreeDepth: ethers.BigNumber.from(epochTreeDepth).toNumber(),
	            nullifierTreeDepth: ethers.BigNumber.from(nullifierTreeDepth).toNumber(),
	            attestingFee: attestingFee,
                epochLength: ethers.BigNumber.from(epochLength).toNumber(),
	            numEpochKeyNoncePerEpoch: ethers.BigNumber.from(numEpochKeyNoncePerEpoch).toNumber(),
	            numAttestationsPerEpochKey: numAttestationsPerEpochKey,
	            defaultGSTLeaf: this.defaultGSTLeaf
            })

            this.globalStateTreeDepth = settings.globalStateTreeDepth
            this.userStateTreeDepth = settings.userStateTreeDepth
            this.epochTreeDepth = settings.epochTreeDepth
            this.nullifierTreeDepth = settings.nullifierTreeDepth
            this.numEpochKeyNoncePerEpoch = settings.numEpochKeyNoncePerEpoch
            this.numAttestationsPerEpochKey = settings.numAttestationsPerEpochKey
            this.currentEpoch = currentEpoch
            this.defaultGSTLeaf = settings.defaultGSTLeaf

            await settings.save()
        }
    }

    public disconnectDB = async () => {
        this.db.disconnect()
    }

    private getGSTLeaves = async (epoch: number): Promise<string[]> => {
        const treeLeaves = await GSTLeaves?.findOne({epoch: epoch})
        return treeLeaves?.get('GSTLeaves.hashedLeaf')
    }

    private getEpochTreeLeaves = async (epoch: number): Promise<IEpochTreeLeaf[]> => {
        const treeLeaves = await EpochTreeLeaves?.findOne({epoch: epoch})
        return treeLeaves?.get('epochTreeLeaves')
    }

    private getNullifiers = async (): Promise<string[]> => {
        const treeLeaves = await NullifierTreeLeaves?.find()
        return treeLeaves.map((l) => (l.nullifier))
    }

    private saveGSTLeaf = async (epoch: number, newLeaf: IGSTLeaf): Promise<void> => {
        let treeLeaves: IGSTLeaves | null = await GSTLeaves.findOne({epoch: epoch})

        if(!treeLeaves){
            treeLeaves = new GSTLeaves({
                epoch: epoch,
                GSTLeaves: [newLeaf],
                currentEpochGSTLeafIndexToInsert: 1
            })
        } else {
            const nextIndex = treeLeaves.currentEpochGSTLeafIndexToInsert + 1
            treeLeaves.get('GSTLeaves').push(newLeaf)
            treeLeaves.set('currentEpochGSTLeafIndexToInsert', nextIndex)
        }

        await treeLeaves?.save()
    }

    private saveNullifiers = async (nullifiers: any[], epoch: number, transactionHash: string) => {
        for (let nullifier of nullifiers) {
            if (nullifier > BigInt(0)) {
                assert(nullifier < BigInt(2 ** this.nullifierTreeDepth), `Nullifier(${nullifier}) larger than max leaf value(2**nullifierTreeDepth)`)
                const findNullifier = await NullifierTreeLeaves.findOne({nullifier: nullifier})
                assert(!findNullifier, `Nullifier(${nullifier}) seen before`)
                const nullifierLeaf = new NullifierTreeLeaves({
                    epoch: epoch,
                    nullifier: nullifier,
                    transactionHash: transactionHash
                })
                await nullifierLeaf.save()
            }
        }
    }

    /*
    * get GST leaf index of given epoch
    * @param epoch find GST leaf in the epoch
    * @param hasedLeaf find the hash of GST leaf
    */
    public getGSTLeafIndex = async (epoch: number, hashedLeaf: string): Promise<number> => {

        const leaves = await GSTLeaves.findOne({epoch: epoch})
        if(leaves){
            for(const leaf of leaves.get('GSTLeaves')){
                if (leaf.hashedLeaf == hashedLeaf){
                    return leaves?.GSTLeaves?.indexOf(leaf)
                }
            }
        }

        return -1
    }

    public genGSTree = async (epoch: number): Promise<IncrementalQuinTree> => {
        const GSTLeaves = await this.getGSTLeaves(epoch)
        const GSTree = new IncrementalQuinTree(
            this.globalStateTreeDepth,
            this.defaultGSTLeaf,
            2,
        )

        for (let i = 0; i < GSTLeaves?.length; i++) {
            GSTree.insert(BigInt(GSTLeaves[i]))
        }

        return GSTree
    }

    public genEpochTree = async (epoch: number): Promise<SparseMerkleTreeImpl> => {
        const epochTreeLeaves = await this.getEpochTreeLeaves(epoch)
        const epochTree = await genNewSMT(this.epochTreeDepth, SMT_ONE_LEAF)

        for(const leaf of epochTreeLeaves) {
            const decEpochKey = BigInt(BigInt(add0x(leaf.epochKey)).toString())
            await epochTree.update(decEpochKey, BigInt(leaf.hashchainResult))
        }

        return epochTree
    }

    public genNullifierTree = async (): Promise<SparseMerkleTreeImpl> => {
        const treeLeaves = await this.getNullifiers()
        const nullifierTree = await genNewSMT(this.nullifierTreeDepth, SMT_ZERO_LEAF)
        await nullifierTree.update(BigInt(0), SMT_ONE_LEAF)
        if (treeLeaves.length == 0) return nullifierTree
        else {
            for (const leaf of treeLeaves) {
                await nullifierTree.update(BigInt(leaf), SMT_ONE_LEAF)
            }
            return nullifierTree
        }
    }

    public reputationNullifierExists = async (nullifier: string) => {
        return ReputationNullifier?.findOne({nullifiers: nullifier})
    }

    public userSignUp = async (
        event: ethers.Event,
        startBlock: number  = DEFAULT_START_BLOCK,
    ) => {
        // The event has been processed
        if(event.blockNumber <= startBlock) return

        const iface = new ethers.utils.Interface(Unirep.abi)
        const decodedData = iface.decodeEventLog("NewGSTLeafInserted",event.data)

        const _transactionHash = event.transactionHash
        const _epoch = Number(event?.topics[1])
        const _hashedLeaf = add0x(decodedData?._hashedLeaf._hex)

        // save the new leaf
        const newLeaf: IGSTLeaf = {
            transactionHash: _transactionHash,
            hashedLeaf: _hashedLeaf
        }

        await this.saveGSTLeaf(_epoch, newLeaf)
    }

    public epochEnded = async (
        event: ethers.Event,
        unirepContract: ethers.Contract,
        startBlock: number  = DEFAULT_START_BLOCK,
    ): Promise<void> => {
        // The event has been processed
        if(event.blockNumber <= startBlock) return

        // update Unirep state
        const epoch = Number(event?.topics[1])

        // Get epoch tree leaves of the ending epoch
        let [epochKeys_, epochKeyHashchains_] = await unirepContract.getEpochTreeLeaves(epoch)
        epochKeys_ = epochKeys_.map((epk) => BigInt(epk).toString(16))
        epochKeyHashchains_ = epochKeyHashchains_.map((hc) => BigInt(hc).toString())
    
        const epochTreeLeaves: IEpochTreeLeaf[] = []
        for (let i = 0; i < epochKeys_.length; i++) {
            const epochTreeLeaf: IEpochTreeLeaf = {
                epochKey: epochKeys_[i],
                hashchainResult: epochKeyHashchains_[i]
            }
            epochTreeLeaves.push(epochTreeLeaf)
        }
    
        const newEpochTreeLeaves = new EpochTreeLeaves({
            epoch: epoch,
            epochTreeLeaves: epochTreeLeaves
        })

        const treeLeaves: IGSTLeaves = new GSTLeaves({
            epoch: epoch + 1,
            GSTLeaves: [],
            currentEpochGSTLeafIndexToInsert: 1
        })

        await newEpochTreeLeaves?.save()
        await treeLeaves?.save()
        this.currentEpoch = epoch + 1
    }

    public userStateTransition = async (
        event: ethers.Event,
        startBlock: number  = DEFAULT_START_BLOCK,
    ) => {

        // The event has been processed
        if(event.blockNumber <= startBlock) return

        const iface = new ethers.utils.Interface(Unirep.abi)
        const _toEpoch = Number(event.topics[1])
        const decodedUserStateTransitionedData = iface.decodeEventLog("UserStateTransitioned",event.data)
        const _transactionHash = event.transactionHash
        const _hashedLeaf = add0x(decodedUserStateTransitionedData?.userTransitionedData?.newGlobalStateTreeLeaf._hex)

        // save new user transitioned state
        const newUserState: IUserTransitionedState = new UserTransitionedState({
            transactionHash: _transactionHash,
            toEpoch: _toEpoch,
            fromEpoch: decodedUserStateTransitionedData?.userTransitionedData?.fromEpoch._hex,
            fromGlobalStateTree: decodedUserStateTransitionedData?.userTransitionedData?.fromGlobalStateTree._hex,
            fromEpochTree: decodedUserStateTransitionedData?.userTransitionedData?.fromEpochTree._hex,
            fromNullifierTreeRoot: decodedUserStateTransitionedData?.userTransitionedData?.fromNullifierTreeRoot._hex,
            newGlobalStateTreeLeaf: _hashedLeaf,
            proof: decodedUserStateTransitionedData?.userTransitionedData?.proof,
            attestationNullifiers: decodedUserStateTransitionedData?.userTransitionedData?.attestationNullifiers,
            epkNullifiers: decodedUserStateTransitionedData?.userTransitionedData?.epkNullifiers,
        })

        await newUserState.save()

        // save the new GST leaf
        const newLeaf: IGSTLeaf = {
            transactionHash: _transactionHash,
            hashedLeaf: _hashedLeaf
        }

        await this.saveGSTLeaf(_toEpoch, newLeaf)

        // save nullifiers
        const attestationNullifiers = decodedUserStateTransitionedData?.userTransitionedData?.attestationNullifiers.map((n) => BigInt(n))
        const epkNullifiers = decodedUserStateTransitionedData?.userTransitionedData?.epkNullifiers.map((n) => BigInt(n))
        // Combine nullifiers and mod them
        const allNullifiers = attestationNullifiers?.concat(epkNullifiers).map((nullifier) => BigInt(nullifier) % BigInt(2 ** this.nullifierTreeDepth))

        await this.saveNullifiers(allNullifiers, _toEpoch, _transactionHash)
    }
}

export {
    UnirepState,
}