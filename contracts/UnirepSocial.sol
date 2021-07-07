// SPDX-License-Identifier: UNLICENSED
pragma abicoder v2;
pragma solidity 0.7.6;

import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import { Unirep } from './Unirep.sol';

contract UnirepSocial {
    using SafeMath for uint256;

    Unirep public unirep;

    enum actionChoices { UpVote, DownVote, Post, Comment }

    // The amount of karma required to publish a post
    uint256 immutable public postReputation;

    // The amount of karma required to submit a comment 
    uint256 immutable public commentReputation;

    // The amount of karma airdropped to user when user signs up and executes user state transition
    uint256 immutable public airdroppedReputation;

    // help Unirep Social track event
    event UserSignedUp(
        uint256 indexed _epoch,
        uint256 _leafIndex
    );

    event PostSubmitted(
        uint256 indexed _epoch,
        uint256 indexed _postId,
        uint256 indexed _epochKey,
        string _hahsedContent,
        uint256[] nullifiers,
        Unirep.ReputationProofSignals proofSignals,
        uint256[8] proof
    );

    event CommentSubmitted(
        uint256 indexed _epoch,
        uint256 indexed _postId,
        uint256 indexed _epochKey,
        uint256 _commentId,
        string _hahsedContent,
        uint256[] nullifiers,
        Unirep.ReputationProofSignals proofSignals,
        uint256[8] proof
    );

    event VoteSubmitted(
        uint256 indexed _epoch,
        uint256 indexed _fromEpochKey,
        uint256 indexed _toEpochKey,
        Unirep.Attestation attestation,
        uint256[] nullifiers,
        Unirep.ReputationProofSignals proofSignals,
        uint256[8] proof
    );

    event UserStateTransitioned(
        uint256 indexed _epoch,
        uint256 _leafIndex
    );


    constructor(
        Unirep _unirepContract,
        uint256 _postReputation,
        uint256 _commentReputation,
        uint256 _airdroppedReputation
    ) {
        // Set the unirep contracts
        unirep = _unirepContract;

        // signup Unirep Social contract as an attester in Unirep contract
        unirep.attesterSignUp();

        postReputation = _postReputation;
        commentReputation = _commentReputation;
        airdroppedReputation = _airdroppedReputation;
    }

    /*
     * Call Unirep contract to perform user signing up
     * @param _identityCommitment Commitment of the user's identity which is a semaphore identity.
     */
    function userSignUp(uint256 _identityCommitment) external {
        unirep.userSignUp(_identityCommitment, airdroppedReputation);

        emit UserSignedUp(
            unirep.currentEpoch(),
            unirep.nextGSTLeafIndex() - 1
        );
    }

    function attesterSignUp(bytes calldata signature) external {
        unirep.attesterSignUpViaRelayer(msg.sender, signature);
    }

    function publishPost(
        uint256 postId, 
        uint256 epochKey, 
        string calldata hashedContent, 
        uint256[] calldata _nullifiers, 
        Unirep.ReputationProofSignals calldata _proofSignals,
        uint256[8] calldata _proof) external payable {

        // Call Unirep contract to perform reputation spending
        unirep.spendReputation{value: unirep.attestingFee()}(epochKey, _nullifiers, _proofSignals, _proof, postReputation);
        
        emit PostSubmitted(
            unirep.currentEpoch(),
            postId,
            epochKey,
            hashedContent,
            _nullifiers,
            _proofSignals,
            _proof
        );
    }

    function leaveComment(
        uint256 postId, 
        uint256 commentId,
        uint256 epochKey, 
        string calldata hashedContent, 
        uint256[] calldata _nullifiers, 
        Unirep.ReputationProofSignals calldata _proofSignals,
        uint256[8] calldata _proof) external payable {

        // Call Unirep contract to perform reputation spending        
        unirep.spendReputation{value: unirep.attestingFee()}(epochKey, _nullifiers, _proofSignals, _proof, commentReputation);
    
        emit CommentSubmitted(
            unirep.currentEpoch(),
            postId,
            epochKey,
            commentId,
            hashedContent,
            _nullifiers,
            _proofSignals,
            _proof
        );
    }

    function vote(
        bytes memory signature,
        Unirep.Attestation memory attestation,
        uint256 toEpochKey,
        uint256 fromEpochKey,
        uint256[] memory _nullifiers,
        Unirep.ReputationProofSignals memory _proofSignals,
        uint256[8] memory _proof ) external payable {
        uint256 voteValue = attestation.posRep + attestation.negRep;
        require(voteValue > 0, "Unirep Social: should submit a positive vote value");
        require(attestation.posRep * attestation.negRep == 0, "Unirep Social: should only choose to upvote or to downvote");

        // Spend attester's reputation
        // Call Unirep contract to perform reputation spending
        unirep.submitAttestationViaRelayer{value: unirep.attestingFee()}(msg.sender, signature, attestation, fromEpochKey, toEpochKey, _nullifiers, _proofSignals, _proof);

        emit VoteSubmitted(
            unirep.currentEpoch(),
            fromEpochKey, 
            toEpochKey, 
            attestation, 
            _nullifiers,
            _proofSignals,
            _proof
        );
    }

    function beginEpochTransition(uint256 numEpochKeysToSeal) external {
        unirep.beginEpochTransition(numEpochKeysToSeal);
    }

    function updateUserStateRoot(
        uint256 _newGlobalStateTreeLeaf,
        uint256[] memory _attestationNullifiers,
        uint256[] memory _epkNullifiers,
        uint256 _transitionFromEpoch,
        uint256 _fromGlobalStateTree,
        uint256 _fromEpochTree,
        uint256 _fromNullifierTreeRoot,
        uint256[8] memory _proof) external {
        unirep.updateUserStateRoot(_newGlobalStateTreeLeaf, _attestationNullifiers, _epkNullifiers, _transitionFromEpoch, _fromGlobalStateTree, _fromEpochTree, _fromNullifierTreeRoot, _proof);

        emit UserStateTransitioned(
            unirep.currentEpoch(),
            unirep.nextGSTLeafIndex() - 1
        );

    }


    function verifyEpochKeyValidity(
        uint256 _globalStateTree,
        uint256 _epoch,
        uint256 _epochKey,
        uint256[8] memory _proof) public view returns (bool) {
        return unirep.verifyEpochKeyValidity(_globalStateTree, _epoch, _epochKey, _proof);
    }

    function verifyUserStateTransition(
        uint256 _newGlobalStateTreeLeaf,
        uint256[] memory _attestationNullifiers,
        uint256[] memory _epkNullifiers,
        uint256 _transitionFromEpoch,
        uint256 _fromGlobalStateTree,
        uint256 _fromEpochTree,
        uint256[8] memory _proof) public view returns (bool) {
        return unirep.verifyUserStateTransition(_newGlobalStateTreeLeaf, _attestationNullifiers, _epkNullifiers, _transitionFromEpoch, airdroppedReputation, _fromGlobalStateTree, _fromEpochTree, _proof);
    }

    function verifyReputation(
        uint256[] memory _nullifiers,
        uint256 _epoch,
        uint256 _epochKey,
        Unirep.ReputationProofSignals memory _proofSignals,
        uint256[8] memory _proof) public view returns (bool) {
        return unirep.verifyReputation(_nullifiers, _epoch, _epochKey, _proofSignals, _proof);
    }

    function verifyReputationFromAttester(
        uint256 _epoch,
        uint256 _globalStateTree,
        uint256 _nullifierTree,
        uint256 _attesterId,
        Unirep.RepFromAttesterProofSignals memory _proofSignals,
        uint256[8] memory _proof) public view returns (bool) {
        return unirep.verifyReputationFromAttester(_epoch, _globalStateTree, _nullifierTree, _attesterId, _proofSignals, _proof);
    }

    function min(uint a, uint b) internal pure returns (uint) {
        if (a > b) {
            return b;
        } else {
            return a;
        }
    }

    function hashedBlankStateLeaf() public view returns (uint256) {
        return unirep.hashedBlankStateLeaf();
    }

    function getEpochTreeLeaves(uint256 epoch) external view returns (uint256[] memory epochKeyList, uint256[] memory epochKeyHashChainList) {
        return unirep.getEpochTreeLeaves(epoch);
    }

    /*
     * Functions to burn fee and collect compenstation.
     */
    function burnAttestingFee() external {
        unirep.burnAttestingFee();
    }

    function collectEpochTransitionCompensation() external {
        unirep.collectEpochTransitionCompensation();
    }
}