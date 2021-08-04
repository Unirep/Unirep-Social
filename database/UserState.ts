import assert from 'assert'
import { UnirepState } from './UnirepState'
import UserSignUp, { IUserSignUp } from './models/userSignUp'
import Attestations, { IAttestation } from './models/attestation'
import { DEFAULT_AIRDROPPED_KARMA, MAX_KARMA_BUDGET } from '../config/socialMedia'
import { genIdentityCommitment } from 'libsemaphore';
import { hash5, stringifyBigInts } from 'maci-crypto';
import { computeEmptyUserStateRoot, defaultUserStateLeaf, genEpochKey, genEpochKeyNullifier, genKarmaNullifier, genNewSMT } from '../core/utils';
import { add0x, SparseMerkleTreeImpl } from '../crypto/SMT';
import { ethers } from 'ethers';
import Unirep from '../artifacts/contracts/Unirep.sol/Unirep.json'
import { IUserTransitionState } from './utils';
import { Reputation } from '../core/UserState'

class UserState {

    private id: any;
    private unirepState: UnirepState
    private hasSignedUp: boolean; 
    private transitionedPosRep: BigInt
    private transitionedNegRep: BigInt

    constructor(
        _id: any,
        _unirepState: UnirepState
    ) {
        this.id = _id
        this.unirepState = _unirepState
        this.hasSignedUp = false
        this.transitionedPosRep = BigInt(0)
        this.transitionedNegRep = BigInt(0)
    }

    private findUserSignedUpEpochFromDB = async() => {
        const emptyUserStateRoot = computeEmptyUserStateRoot(this.unirepState.userStateTreeDepth)
        const userDefaultGSTLeaf = hash5([
            genIdentityCommitment(this.id),
            emptyUserStateRoot,
            BigInt(DEFAULT_AIRDROPPED_KARMA),
            BigInt(0),
            BigInt(0)
        ]).toString(16)
        const result = await UserSignUp.findOne({hashedLeaf: add0x(userDefaultGSTLeaf)})
        return result
    }

    private genUserState = async() => {
        const idCommitment = genIdentityCommitment(this.id)
        const epochTreeDepth = this.unirepState.epochTreeDepth
        const numEpochKeyNoncePerEpoch = this.unirepState.numEpochKeyNoncePerEpoch

        const userHasSignedUp = await this.findUserSignedUpEpochFromDB()
        assert(userHasSignedUp, "User has not signed up yet")
        if(!userHasSignedUp){
            return
        }

        // start user state
        let transitionedFromEpoch = userHasSignedUp?.epoch ? userHasSignedUp?.epoch : 0
        let startEpoch = transitionedFromEpoch
        let transitionedPosRep = DEFAULT_AIRDROPPED_KARMA
        let transitionedNegRep = 0
        let userStates: {[key: number]: IUserTransitionState} = {}
        let GSTLeaf = userHasSignedUp?.hashedLeaf
        let userStateTree: SparseMerkleTreeImpl = await this.genUserStateTree([])
        let attestations: IAttestation[] = []
        let transitionedGSTLeaf = await this.unirepState.getGSTLeafIndex(startEpoch, GSTLeaf)
   
        // find all reputation received by the user
        for (let e = startEpoch; e <= this.unirepState.currentEpoch; e++) {

            // find if user has transitioned 
            if (e !== startEpoch) {
                transitionedGSTLeaf = await this.unirepState.getGSTLeafIndex(e, GSTLeaf)
            }
        
            // user transitioned state
            const newState: IUserTransitionState = {
                transitionedGSTLeafIndex: transitionedGSTLeaf,
                fromEpoch: transitionedFromEpoch,
                toEpoch: e,
                userStateTree: userStateTree,
                attestations: attestations,
                transitionedPosRep: BigInt(transitionedPosRep),
                transitionedNegRep: BigInt(transitionedNegRep),
                GSTLeaf: GSTLeaf
            }
            userStates[e] = newState

            // get all attestations from epoch key generated in the given epoch e
            attestations = []
            for (let nonce = 0; nonce < numEpochKeyNoncePerEpoch; nonce++) {
                const epochKey = genEpochKey(this.id.identityNullifier, e, nonce, epochTreeDepth)
                const attestationToEpk = await Attestations.findOne({epochKey: epochKey.toString(16)})
                attestationToEpk?.attestations?.map((a) => {attestations.push(a)})
            }
            userStateTree = await this.genUserStateTree(attestations)

            // compute user state transition result
            transitionedFromEpoch = e
            for (const attestation of attestations) {
                transitionedPosRep += Number(attestation.posRep)
                transitionedNegRep += Number(attestation.negRep)
            }
            transitionedPosRep += DEFAULT_AIRDROPPED_KARMA
            GSTLeaf = add0x(hash5([
                idCommitment,
                userStateTree.getRootHash(),
                BigInt(transitionedPosRep),
                BigInt(transitionedNegRep),
                BigInt(0)
            ]).toString(16))
        }

        return userStates
    }

    public signUp = async (event: ethers.Event) => {
        assert(!this.hasSignedUp, "User has already signed up")
        const iface = new ethers.utils.Interface(Unirep.abi)
        const decodedData = iface.decodeEventLog("NewGSTLeafInserted",event.data)
        const newUser: IUserSignUp = new UserSignUp({
            transactionHash: event.transactionHash,
            hashedLeaf: add0x(decodedData?._hashedLeaf._hex),
            epoch: Number(event?.topics[1])
        })
        await newUser.save()
        this.hasSignedUp = true
        this.transitionedPosRep = BigInt(DEFAULT_AIRDROPPED_KARMA)
    }

    public login = async () => {
        return await this.genUserState()
    }

    /*
    * generate user state tree from given reputations
    * @param reputations reputations received by user in current epoch
    */
    private genUserStateTree = async(
        reputations: IAttestation[]
    ): Promise<SparseMerkleTreeImpl> => {
        let reputationRecords = {}
        const USTree = await genNewSMT(this.unirepState.userStateTreeDepth, defaultUserStateLeaf)
    
        for (const reputation of reputations) {
            if (reputationRecords[reputation.attesterId] === undefined) {
                reputationRecords[reputation.attesterId] = new Reputation(
                    BigInt(reputation.posRep),
                    BigInt(reputation.negRep),
                    BigInt(reputation.graffiti)
                )
            } else {
                // Update attestation record
                reputationRecords[reputation.attesterId].update(
                    BigInt(reputation.posRep),
                    BigInt(reputation.negRep),
                    BigInt(reputation.graffiti),
                    reputation.overwriteGraffiti
                )
            }
        }
    
        for (let attesterId in reputationRecords) {
            const hashedReputation = hash5([
                BigInt(reputationRecords[attesterId].posRep),
                BigInt(reputationRecords[attesterId].negRep),
                BigInt(reputationRecords[attesterId].graffiti),
                BigInt(0),
                BigInt(0)
            ])
            await USTree.update(BigInt(attesterId), hashedReputation)
        }
    
        return USTree
    }

    public genProveReputationCircuitInputs = async (
        epochKeyNonce: number,
        proveKarmaAmount: number,
        minRep: number,
    ) => {
        const epochTreeDepth = this.unirepState.epochTreeDepth
        const nullifierTreeDepth = this.unirepState.nullifierTreeDepth

        const userState = await this.genUserState()
        const epoch = this.unirepState.currentEpoch
        if(!userState) return
        const epochKey = genEpochKey(this.id.identityNullifier, epoch, epochKeyNonce, epochTreeDepth)
        const nonce = 0
        const userStateTree = await userState[epoch].userStateTree
        const GSTree = await this.unirepState.genGSTree(epoch)
        const GSTLeafIndex = await this.unirepState.getGSTLeafIndex(epoch, userState[epoch].GSTLeaf)
        const GSTreeProof = GSTree.genMerklePath(GSTLeafIndex)
        const GSTreeRoot = GSTree.root
        const nullifierTree = await this.unirepState.genNullifierTree()
        const nullifierTreeRoot = nullifierTree.getRootHash()
        const epkNullifier = genEpochKeyNullifier(this.id.identityNullifier, epoch, nonce, nullifierTreeDepth)
        const epkNullifierProof = await nullifierTree.getMerkleProof(epkNullifier)
        const hashedLeaf = hash5([
            genIdentityCommitment(this.id),
            userStateTree.getRootHash(),
            userState[epoch].transitionedPosRep,
            userState[epoch].transitionedNegRep,
            BigInt(0)
        ])
        let nonceStarter = -1
        const repDiff: number = Number(userState[epoch].transitionedPosRep) - Number(userState[epoch].transitionedNegRep)

        // find valid nonce starter
        for (let n = 0; n < repDiff ; n++) {
            const karmaNullifier = genKarmaNullifier(this.id.identityNullifier, epoch, n, nullifierTreeDepth)
            const res = await this.unirepState.reputationNullifierExists(karmaNullifier.toString())
            if(!res) {
                nonceStarter = n
                break
            }
        }
        assert(nonceStarter != -1, "Cannot find valid nonce")
        assert((nonceStarter + proveKarmaAmount) <= repDiff, "Not enough karma to spend")
        const selectors: BigInt[] = []
        const nonceList: BigInt[] = []
        for (let i = 0; i < proveKarmaAmount; i++) {
            nonceList.push( BigInt(nonceStarter + i) )
            selectors.push(BigInt(1));
        }
        for (let i = proveKarmaAmount ; i < MAX_KARMA_BUDGET; i++) {
            nonceList.push(BigInt(0))
            selectors.push(BigInt(0))
        }

        return stringifyBigInts({
            epoch: epoch,
            nonce: nonce,
            identity_pk: this.id.keypair.pubKey,
            identity_nullifier: this.id.identityNullifier, 
            identity_trapdoor: this.id.identityTrapdoor,
            user_tree_root: userStateTree.getRootHash(),
            user_state_hash: hashedLeaf,
            epoch_key_nonce: epochKeyNonce,
            epoch_key: epochKey,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            nullifier_tree_root: nullifierTreeRoot,
            nullifier_path_elements: epkNullifierProof,
            selectors: selectors,
            positive_karma: userState[epoch].transitionedPosRep,
            negative_karma: userState[epoch].transitionedNegRep,
            prove_karma_nullifiers: BigInt(Boolean(proveKarmaAmount)),
            prove_karma_amount: BigInt(proveKarmaAmount),
            karma_nonce: nonceList,
            prove_min_rep: BigInt(Boolean(minRep)),
            min_rep: BigInt(minRep)
        })
    }
}

export {
    UserState,
}