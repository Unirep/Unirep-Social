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

    // A mapping between user’s epoch key and if they request airdrop in the current epoch;
    // One epoch key is allowed to get airdrop once an epoch
    mapping(uint256 => bool) public isEpochKeyGotAirdrop;

    // help Unirep Social track event
    event UserSignedUp(
        uint256 indexed _epoch,
        uint256 indexed _identityCommitment
    );

    event AirdropSubmitted(
        uint256 indexed _epoch,
        uint256 indexed _epochKey,
        Unirep.SignUpProofRelated proofRelated
    );

    event PostSubmitted(
        uint256 indexed _epoch,
        uint256 indexed _postId,
        uint256 indexed _epochKey,
        string _hahsedContent,
        Unirep.ReputationProofRelated proofRelated
    );

    event CommentSubmitted(
        uint256 indexed _epoch,
        uint256 indexed _postId,
        uint256 indexed _epochKey,
        uint256 _commentId,
        string _hahsedContent,
        Unirep.ReputationProofRelated proofRelated
    );

    event VoteSubmitted(
        uint256 indexed _epoch,
        uint256 indexed _fromEpochKey,
        uint256 indexed _toEpochKey,
        uint256 upvoteValue,
        uint256 downvoteValue,
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
        Unirep.ReputationProofRelated memory _proofRelated
    ) external payable {
        require(_proofRelated.proveReputationAmount == postReputation, "Unirep Social: submit different nullifiers amount from the required amount for post");
        require(_proofRelated.attesterId == attesterId, "Unirep Social: submit a proof with different attester ID from Unirep Social");

        // Spend reputation
        unirep.spendReputation{value: unirep.attestingFee()}(_proofRelated);

        emit PostSubmitted(
            unirep.currentEpoch(),
            postId,
            _proofRelated.epochKey,
            hashedContent,
            _proofRelated
        );
    }

    function leaveComment(
        uint256 postId, 
        uint256 commentId, 
        string memory hashedContent, 
        Unirep.ReputationProofRelated memory _proofRelated
    ) external payable {
        require(_proofRelated.proveReputationAmount == commentReputation, "Unirep Social: submit different nullifiers amount from the required amount for comment");
        require(_proofRelated.attesterId == attesterId, "Unirep Social: submit a proof with different attester ID from Unirep Social");

        // Spend reputation
        unirep.spendReputation{value: unirep.attestingFee()}(_proofRelated);
    
        emit CommentSubmitted(
            unirep.currentEpoch(),
            postId,
            _proofRelated.epochKey,
            commentId,
            hashedContent,
            _proofRelated
        );
    }

    function vote(
        uint256 upvoteValue,
        uint256 downvoteValue,
        uint256 toEpochKey,
        uint256 toEpochKeyProofIndex,
        Unirep.ReputationProofRelated memory _proofRelated
    ) external payable {
        uint256 voteValue = upvoteValue + downvoteValue;
        require(voteValue > 0, "Unirep Social: should submit a positive vote value");
        require(upvoteValue * downvoteValue == 0, "Unirep Social: should only choose to upvote or to downvote");
        require(_proofRelated.proveReputationAmount == voteValue, "Unirep Social: submit different nullifiers amount from the vote value");
        require(_proofRelated.attesterId == attesterId, "Unirep Social: submit a proof with different attester ID from Unirep Social");
        require(toEpochKey != _proofRelated.epochKey, "Unirep Social: epoch key sender and receiver cannot be the same");

        // Submit attestation to receiver's epoch key
        Unirep.Attestation memory attestation;
        attestation.attesterId = attesterId;
        attestation.posRep = upvoteValue;
        attestation.negRep = downvoteValue;
        unirep.submitAttestation{value: unirep.attestingFee()}(attestation, toEpochKey, toEpochKeyProofIndex);

        // Spend reputation
        unirep.spendReputation{value: unirep.attestingFee()}(_proofRelated);

        emit VoteSubmitted(
            unirep.currentEpoch(),
            _proofRelated.epochKey, 
            toEpochKey, 
            upvoteValue,
            downvoteValue, 
            _proofRelated
        );
    }

    function airdrop(
        Unirep.SignUpProofRelated memory _signUpProofData
    ) external payable {
        require(isEpochKeyGotAirdrop[_signUpProofData.epochKey] == false, "Unirep Social: the epoch key has been airdropped");
        require(_signUpProofData.attesterId == attesterId, "Unirep Social: submit a proof with different attester ID from Unirep Social");
        
        // Submit airdrop
        unirep.airdropEpochKey{value: unirep.attestingFee()}(_signUpProofData);

        // Set the epoch key has been airdropped
        isEpochKeyGotAirdrop[_signUpProofData.epochKey] = true;

        emit AirdropSubmitted(
            unirep.currentEpoch(),
            _signUpProofData.epochKey, 
            _signUpProofData
        );
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

    function updateUserStateRoot(Unirep.UserTransitionedRelated memory userTransitionedData, uint256[] memory proofIndexes) external {
        unirep.updateUserStateRoot(userTransitionedData, proofIndexes);
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

    function verifyUserSignUp(
        uint256 _epoch,
        uint256 _epochKey,
        uint256 _globalStateTree,
        uint256 _attesterId,
        uint256[8] calldata _proof) external view returns (bool) {
        return unirep.verifyUserSignUp(_epoch, _epochKey, _globalStateTree, _attesterId, _proof);
    }
}