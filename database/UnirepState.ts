import mongoose from 'mongoose'

import GSTLeaves, { IGSTLeaf, IGSTLeaves } from '../database/models/GSTLeaf'
import EpochTreeLeaves, { IEpochTreeLeaf } from '../database/models/epochTreeLeaf'
import NullifierTreeLeaves, { INullifierTreeLeaves } from '../database/models/nullifierTreeLeaf'
import Attestations, { IAttestation } from './models/attestation'
import UserSignUp, { IUserSignUp } from './models/userSignUp'
import Settings, { ISettings } from './models/settings'
import { hash5, IncrementalQuinTree } from 'maci-crypto'
import { ethers } from 'ethers'
import { computeEmptyUserStateRoot, genNewSMT, SMT_ONE_LEAF, SMT_ZERO_LEAF } from '../core/utils'
import { epochTreeDepth, globalStateTreeDepth, nullifierTreeDepth, userStateTreeDepth } from '../config/testLocal'
import { add0x, SparseMerkleTreeImpl } from '../crypto/SMT'

class UnirepState {
    private uri: string
    private db: any
    public globalStateTreeDepth: number
    public userStateTreeDepth: number
    public epochTreeDepth: number
    public nullifierTreeDepth: number
    public defaultGSTLeaf: BigInt

    constructor(
       dbUri: string,
    ) {
        this.uri = dbUri
        this.globalStateTreeDepth = globalStateTreeDepth
        this.userStateTreeDepth = userStateTreeDepth
        this.epochTreeDepth = epochTreeDepth
        this.nullifierTreeDepth = nullifierTreeDepth
        const emptyUserStateRoot = computeEmptyUserStateRoot(ethers.BigNumber.from(userStateTreeDepth).toNumber())
        this.defaultGSTLeaf = hash5([
            BigInt(0),  // zero identityCommitment
            emptyUserStateRoot,  // zero user state root
            BigInt(0), // default airdropped karma
            BigInt(0), // default negative karma
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
}

export {
    UnirepState,
}