// SPDX-License-Identifier: UNLICENSED
pragma abicoder v2;
pragma solidity 0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import { Unirep } from "@unirep/contracts/contracts/Unirep.sol";

contract UnirepSocial {
    using SafeMath for uint256;

    Unirep public unirep;

    // Unirep social's attester ID
    uint256 immutable public attesterId;

    // The amount of karma required to publish a post
    uint256 immutable public postReputation;

    // The amount of karma required to submit a comment 
    uint256 immutable public commentReputation;

    // The amount of karma airdropped to user when user signs up and executes user state transition
    uint256 immutable public airdroppedReputation;

    // help Unirep Social track event
    event UserSignedUp(
        uint256 indexed _epoch,
        uint256 indexed _identityCommitment
    );

    event PostSubmitted(
        uint256 indexed _epoch,
        uint256 indexed _postId,
        uint256 indexed _epochKey,
        string _hahsedContent,
        uint256[] nullifiers,
        Unirep.ReputationProofRelated proofRelated
    );

    event CommentSubmitted(
        uint256 indexed _epoch,
        uint256 indexed _postId,
        uint256 indexed _epochKey,
        uint256 _commentId,
        string _hahsedContent,
        uint256[] nullifiers,
        Unirep.ReputationProofRelated proofRelated
    );

    event VoteSubmitted(
        uint256 indexed _epoch,
        uint256 indexed _fromEpochKey,
        uint256 indexed _toEpochKey,
        uint256 upvoteValue,
        uint256 downvoteValue,
        uint256[] nullifiers,
        Unirep.ReputationProofRelated proofRelated
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
        unirep.setAirdropAmount(_airdroppedReputation);
        attesterId = unirep.attesters(address(this));

        postReputation = _postReputation;
        commentReputation = _commentReputation;
        airdroppedReputation = _airdroppedReputation;
    }

    /*
     * Call Unirep contract to perform user signing up
     * @param _identityCommitment Commitment of the user's identity which is a semaphore identity.
     */
    function userSignUp(uint256 _identityCommitment) external {
        unirep.userSignUp(_identityCommitment);

        emit UserSignedUp(
            unirep.currentEpoch(),
            _identityCommitment
        );
    }

    function publishPost(
        uint256 postId, 
        string memory hashedContent, 
        uint256[] memory _nullifiers, 
        Unirep.ReputationProofRelated memory _proofRelated
    ) external payable {

        // Call Unirep contract to perform reputation spending
        // unirep.spendReputation{value: unirep.attestingFee()}(epochKey, _nullifiers, _proofRelated, _proof, postReputation);
        Unirep.Attestation memory attestation;
        attestation.attesterId = attesterId;
        attestation.negRep = postReputation;

        require(_proofRelated.proveReputationAmount == postReputation, "Unirep Social: submit different nullifiers amount from the required amount for post");

        // Spend reputation
        unirep.submitReputationNullifiers(_nullifiers, unirep.currentEpoch(), _proofRelated.epochKey, _proofRelated.globalStateTree, _proofRelated.attesterId, _proofRelated.proveReputationAmount, _proofRelated.minRep, _proofRelated.proveGraffiti, _proofRelated.graffitiPreImage, _proofRelated.proof);

        // Send negative attestataion
        unirep.submitAttestation{value: unirep.attestingFee()}(attestation, _proofRelated.epochKey);

        emit PostSubmitted(
            unirep.currentEpoch(),
            postId,
            _proofRelated.epochKey,
            hashedContent,
            _nullifiers,
            _proofRelated
        );
    }

    function leaveComment(
        uint256 postId, 
        uint256 commentId, 
        string memory hashedContent, 
        uint256[] memory _nullifiers, 
        Unirep.ReputationProofRelated memory _proofRelated
    ) external payable {

        // Call Unirep contract to perform reputation spending        
        // unirep.spendReputation{value: unirep.attestingFee()}(epochKey, _nullifiers, _proofRelated, _proof, commentReputation);
        // send negative reputation to the sender
        Unirep.Attestation memory attestation;
        attestation.attesterId = attesterId;
        attestation.negRep = commentReputation;

        require(_proofRelated.proveReputationAmount == commentReputation, "Unirep Social: submit different nullifiers amount from the required amount for comment");

         // Spend reputation
        unirep.submitReputationNullifiers(_nullifiers, unirep.currentEpoch(), _proofRelated.epochKey, _proofRelated.globalStateTree, _proofRelated.attesterId, _proofRelated.proveReputationAmount, _proofRelated.minRep, _proofRelated.proveGraffiti, _proofRelated.graffitiPreImage, _proofRelated.proof);

        // Send negative attestataion
        unirep.submitAttestation{value: unirep.attestingFee()}(attestation, _proofRelated.epochKey);

    
        emit CommentSubmitted(
            unirep.currentEpoch(),
            postId,
            _proofRelated.epochKey,
            commentId,
            hashedContent,
            _nullifiers,
            _proofRelated
        );
    }

    function vote(
        uint256 upvoteValue,
        uint256 downvoteValue,
        uint256 toEpochKey,
        uint256[] memory _nullifiers,
        Unirep.ReputationProofRelated memory _proofRelated
    ) external payable {
        uint256 voteValue = upvoteValue + downvoteValue;
        require(voteValue > 0, "Unirep Social: should submit a positive vote value");
        require(upvoteValue * downvoteValue == 0, "Unirep Social: should only choose to upvote or to downvote");
        require(_proofRelated.proveReputationAmount == voteValue, "Unirep Social: submit different nullifiers amount from the vote value");
        require(_proofRelated.attesterId == attesterId, "Unirep Social: submit a proof with different attester ID from Unirep Social");

        // Spend attester's reputation
        // Call Unirep contract to perform reputation spending
        // unirep.submitAttestationViaRelayer{value: unirep.attestingFee()}(msg.sender, signature, attestation, fromEpochKey, toEpochKey, _nullifiers, _proofRelated, _proof);

        // Spend reputation
        unirep.submitReputationNullifiers(_nullifiers, unirep.currentEpoch(), _proofRelated.epochKey, _proofRelated.globalStateTree, _proofRelated.attesterId, _proofRelated.proveReputationAmount, _proofRelated.minRep, _proofRelated.proveGraffiti, _proofRelated.graffitiPreImage, _proofRelated.proof);

        // Submit attestation to receiver's epoch key
        Unirep.Attestation memory attestation;
        attestation.attesterId = attesterId;
        attestation.posRep = upvoteValue;
        attestation.negRep = downvoteValue;
        unirep.submitAttestation{value: unirep.attestingFee()}(attestation, toEpochKey);

        // send negative reputation to the sender
        attestation.posRep = 0;
        attestation.negRep = voteValue;
        unirep.submitAttestation{value: unirep.attestingFee()}(attestation, _proofRelated.epochKey);

        emit VoteSubmitted(
            unirep.currentEpoch(),
            _proofRelated.epochKey, 
            toEpochKey, 
            upvoteValue,
            downvoteValue, 
            _nullifiers,
            _proofRelated
        );
    }

    function airdrop(
        uint256 epochKey
    ) external payable {
        // TODO: submit a user sign up proof
        Unirep.Attestation memory attestation;
        attestation.attesterId = attesterId;
        attestation.posRep = airdroppedReputation;
        unirep.submitAttestation{value: unirep.attestingFee()}(attestation, epochKey);
    }

    function startUserStateTransition(
        uint256 _blindedUserState,
        uint256 _blindedHashChain,
        uint256 _GSTRoot,
        uint256[8] calldata _proof
    ) external {
        unirep.startUserStateTransition(_blindedUserState, _blindedHashChain, _GSTRoot, _proof);
    }

    function processAttestations(
        uint256 _outputBlindedUserState,
        uint256 _outputBlindedHashChain,
        uint256 _inputBlindedUserState,
        uint256[8] calldata _proof
    ) external {
        unirep.processAttestations(_outputBlindedUserState, _outputBlindedHashChain, _inputBlindedUserState, _proof);
    }

    function updateUserStateRoot(
        uint256 _newGlobalStateTreeLeaf,
        uint256[] memory _epkNullifiers,
        uint256[] memory _blindedUserStates,
        uint256[] memory _blindedHashChains,
        uint256 _transitionFromEpoch,
        uint256 _fromGlobalStateTree,
        uint256 _fromEpochTree,
        uint256[8] memory _proof) external {
        unirep.updateUserStateRoot(_newGlobalStateTreeLeaf, _epkNullifiers, _blindedUserStates, _blindedHashChains, _transitionFromEpoch, _fromGlobalStateTree, _fromEpochTree, _proof);
    }


    function verifyEpochKeyValidity(
        uint256 _globalStateTree,
        uint256 _epoch,
        uint256 _epochKey,
        uint256[8] calldata _proof) external view returns (bool) {
        return unirep.verifyEpochKeyValidity(_globalStateTree, _epoch, _epochKey, _proof);
    }

    function verifyStartTransitionProof(
        uint256 _blindedUserState,
        uint256 _blindedHashChain,
        uint256 _GSTRoot,
        uint256[8] calldata _proof) external view returns (bool) {
        return unirep.verifyStartTransitionProof(_blindedUserState, _blindedHashChain, _GSTRoot, _proof);
    }

    function verifyProcessAttestationProof(
        uint256 _outputBlindedUserState,
        uint256 _outputBlindedHashChain,
        uint256 _inputBlindedUserState,
        uint256[8] calldata _proof) external view returns (bool) {
        return unirep.verifyProcessAttestationProof(_outputBlindedUserState, _outputBlindedHashChain, _inputBlindedUserState, _proof);
    }

    function verifyUserStateTransition(
        uint256 _newGlobalStateTreeLeaf,
        uint256[] memory _epkNullifiers,
        uint256 _transitionFromEpoch,
        uint256[] memory _blindedUserStates,
        uint256 _fromGlobalStateTree,
        uint256[] memory _blindedHashChains,
        uint256 _fromEpochTree,
        uint256[8] memory _proof) external view returns (bool) {
        return unirep.verifyUserStateTransition(_newGlobalStateTreeLeaf, _epkNullifiers, _transitionFromEpoch, _blindedUserStates, _fromGlobalStateTree, _blindedHashChains, _fromEpochTree, _proof);
    }

    function verifyReputation(
        uint256[] memory _repNullifiers,
        uint256 _epoch,
        uint256 _epochKey,
        uint256 _globalStateTree,
        uint256 _attesterId,
        uint256 _proveReputationAmount,
        uint256 _minRep,
        uint256 _proveGraffiti,
        uint256 _graffitiPreImage,
        uint256[8] calldata _proof) external view returns (bool) {
        return unirep.verifyReputation(_repNullifiers, _epoch, _epochKey, _globalStateTree, _attesterId, _proveReputationAmount, _minRep, _proveGraffiti, _graffitiPreImage, _proof);
    }

    function hashedBlankStateLeaf() public view returns (uint256) {
        return unirep.hashedBlankStateLeaf();
    }

    function getEpochTreeLeaves(uint256 epoch) external view returns (uint256[] memory epochKeyList, uint256[] memory epochKeyHashChainList) {
        return unirep.getEpochTreeLeaves(epoch);
    }
}