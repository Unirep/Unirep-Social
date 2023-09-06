// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import '@openzeppelin/contracts/utils/Address.sol';
import {EpochKeyLiteVerifierHelper} from '@unirep/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.sol';
import {ReputationVerifierHelper} from '@unirep/contracts/verifierHelpers/ReputationVerifierHelper.sol';
import {Unirep} from '@unirep/contracts/Unirep.sol';

interface IVerifier {
    /**
     * @return bool Whether the proof is valid given the hardcoded verifying key
     *          above and the public inputs
     */
    function verifyProof(
        uint256[17] calldata publicSignals,
        uint256[8] calldata proof
    ) external view returns (bool);
}

contract UnirepSocial {
    Unirep public unirep;
    IVerifier internal actionVerifier;
    EpochKeyLiteVerifierHelper public epkHelper;
    ReputationVerifierHelper public repHelper;

    // Before Unirep integrates with InterRep
    // We use an admin to controll user sign up
    address internal admin;

    // Unirep social's attester ID
    uint160 public immutable attesterId;

    // The amount of karma required to publish a post
    uint256 public immutable postReputation;

    // The amount of karma required to submit a comment
    uint256 public immutable commentReputation;

    // The amount of karma airdropped to user when user signs up and executes user state transition
    // TODO: init reputation
    // uint256 immutable public airdroppedReputation;

    // The epoch length of Unirep Social
    uint256 public immutable epochLength;

    // The most reputation can be spent in a vote
    uint256 public immutable maxReputationBudget;

    // Positive Reputation field index in Unirep protocol
    uint256 public immutable posRepFieldIndex = 0;

    // Nagative Reputation field index in Unirep protocol
    uint256 public immutable negRepFieldIndex = 1;

    // Graffiti field index in Unirep protocol
    uint256 public immutable graffitiFieldIndex;

    // A mapping between user’s epoch key and if they request airdrop in the current epoch;
    // One epoch key is allowed to get airdrop once an epoch
    mapping(uint256 => bool) public isEpochKeyGotAirdrop;

    // A mapping between username and if they're already claimed;
    mapping(uint256 => bool) public usernames;
    // epoch number to epoch key to amount spent
    mapping(uint256 => mapping(uint256 => uint256)) public subsidies;
    // proof nullifier
    mapping(bytes32 => bool) public usedProofNullifier;
    // reputation nullifier
    mapping(uint256 => bool) public usedRepNullifier;

    uint256 public immutable subsidy;

    // assign posts/comments with an id
    uint256 public contentId = 1;

    // post/comment id => hashed content => epoch key
    mapping(uint256 => mapping(bytes32 => uint256)) public hashedContentMapping;

    // help Unirep Social track event
    event UserSignedUp(
        uint256 indexed epoch,
        uint256 indexed identityCommitment
    );

    event AirdropSubmitted(uint256 indexed epoch, uint256 indexed epochKey);

    event PostSubmitted(
        uint256 indexed epoch,
        uint256 indexed postId,
        uint256 indexed epochKey,
        bytes32 contentHash,
        uint256 minRep
    );

    event CommentSubmitted(
        uint256 indexed epoch,
        uint256 indexed postId,
        uint256 indexed epochKey,
        uint256 commentId,
        bytes32 contentHash,
        uint256 minRep
    );

    event ContentUpdated(
        uint256 indexed id,
        bytes32 oldContentHash,
        bytes32 newContentHash
    );

    event VoteSubmitted(
        uint256 indexed epoch,
        uint256 indexed fromEpochKey,
        uint256 indexed toEpochKey,
        uint256 upvoteValue,
        uint256 downvoteValue,
        uint256 minRep
    );

    struct ActionSignals {
        uint256 epochKey;
        uint256 stateTreeRoot;
        uint256 graffiti;
        bool proveGraffiti;
        uint160 attesterId;
        uint8 nonce;
        uint48 epoch;
        bool revealNonce;
        bool proveMinRep;
        bool proveMaxRep;
        bool proveZeroRep;
        uint256 minRep;
        uint256 maxRep;
        uint256 notEpochKey;
        uint256 data;
        uint256[] nullifiers;
    }

    constructor(
        Unirep _unirepContract,
        IVerifier _actionVerifier,
        EpochKeyLiteVerifierHelper _epkHelper,
        ReputationVerifierHelper _repHelper,
        uint256 _postReputation,
        uint256 _commentReputation,
        // uint256 _airdroppedReputation,
        uint256 _subsidy,
        uint48 _epochLength,
        uint256 _maxReputationBudget
    ) {
        // Set the unirep contracts
        unirep = _unirepContract;
        actionVerifier = _actionVerifier;
        epkHelper = _epkHelper;
        repHelper = _repHelper;
        // Set admin user
        admin = msg.sender;

        // signup Unirep Social contract as an attester in Unirep contract
        unirep.attesterSignUp(_epochLength);
        attesterId = uint160(address(this));

        postReputation = _postReputation;
        commentReputation = _commentReputation;
        // airdroppedReputation = _airdroppedReputation;
        subsidy = _subsidy;
        epochLength = _epochLength;
        maxReputationBudget = _maxReputationBudget;

        graffitiFieldIndex = unirep.sumFieldCount();
    }

    /*
     * Call Unirep contract to perform user signing up if user hasn't signed up in Unirep
     */
    function userSignUp(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) external {
        require(
            msg.sender == admin,
            'Unirep Social: sign up should through an admin'
        );
        unirep.userSignUp(publicSignals, proof);

        emit UserSignedUp(
            unirep.attesterCurrentEpoch(attesterId),
            publicSignals[0]
        );
    }

    /*
     * Try to spend subsidy for an epoch key in an epoch
     * @param epoch The epoch the subsidy belongs to
     * @param epochKey The epoch key that receives the subsidy
     * @param amount The amount requesting to be spent
     */
    function trySpendSubsidy(
        uint256 epoch,
        uint256 subsidyKey,
        uint256 amount
    ) private {
        uint256 spentSubsidy = subsidies[epoch][subsidyKey];
        require(
            spentSubsidy <= subsidy,
            'Unirep Social: invalid subsidy value'
        );
        uint256 remainingSubsidy = subsidy - spentSubsidy;
        require(
            amount <= remainingSubsidy,
            'Unirep Social: requesting too much subsidy'
        );
        subsidies[epoch][subsidyKey] += amount;
    }

    function _checkProofNullifier(bytes32 nullifier) internal {
        require(
            !usedProofNullifier[nullifier],
            'Unirep Social: the proof is submitted before'
        );
        usedProofNullifier[nullifier] = true;
    }

    function verifyActionProof(
        uint256[17] memory publicSignals,
        uint256[8] memory proof
    ) public view returns (bool) {
        ActionSignals memory signals = decodeActionSignals(publicSignals);
        require(
            unirep.attesterStateTreeRootExists(
                attesterId,
                uint48(signals.epoch),
                signals.stateTreeRoot
            ),
            'Unirep Social: GST root does not exist in epoch'
        );
        require(
            signals.attesterId == attesterId,
            'Unirep Social: attesterId mismatches'
        );
        require(
            signals.epoch == unirep.attesterCurrentEpoch(attesterId),
            'Unirep Social: epoch mismatches'
        );

        return actionVerifier.verifyProof(publicSignals, proof);
    }

    function decodeActionSignals(
        uint256[17] memory publicSignals
    ) public view returns (ActionSignals memory) {
        ActionSignals memory signals;
        signals.epochKey = publicSignals[0];
        signals.stateTreeRoot = publicSignals[1];
        (
            signals.revealNonce,
            signals.attesterId,
            signals.epoch,
            signals.nonce
        ) = epkHelper.decodeEpochKeyControl(publicSignals[2]);
        (
            signals.minRep,
            signals.maxRep,
            signals.proveMinRep,
            signals.proveMaxRep,
            signals.proveZeroRep,
            signals.proveGraffiti
        ) = repHelper.decodeReputationControl(publicSignals[3]);

        uint256[] memory nullifiers = new uint[](maxReputationBudget);
        for (uint256 i = 0; i < maxReputationBudget; i++) {
            nullifiers[i] = publicSignals[4 + i];
        }
        signals.nullifiers = nullifiers;
        signals.notEpochKey = publicSignals[maxReputationBudget + 4];
        signals.graffiti = publicSignals[maxReputationBudget + 5];
        signals.data = publicSignals[maxReputationBudget + 6];
        return signals;
    }

    /**
     * Accepts an action proof
     * publicSignals[0] - epoch key
     * publicSignals[1] - state tree root
     * publicSignals[2] - control0 (epoch key control)
     * publicSignals[3] - control1 (reputation control)
     * publicSignals[4,14] - reputation nullifiers
     * publicSignals[14] - not epoch key
     * publicSignals[15] - graffiti
     * publicSignals[16] - data
     **/
    function getSubsidyAirdrop(
        uint256[17] memory publicSignals,
        uint256[8] memory proof
    ) public payable {
        // check if proof is submitted before
        bytes32 proofNullifier = keccak256(
            abi.encodePacked(publicSignals, proof)
        );
        _checkProofNullifier(proofNullifier);
        // verify the proof
        require(
            verifyActionProof(publicSignals, proof),
            'Unirep Social: proof is invalid'
        );

        ActionSignals memory signals = decodeActionSignals(publicSignals);

        require(
            signals.proveMaxRep,
            'Unirep Social: should prove max reputation'
        );
        require(
            signals.revealNonce && (signals.nonce == 0),
            'Unirep Social: epoch key nonce is not valid'
        );
        uint requestedSubsidy = signals.maxRep; // the amount proved
        uint receivedSubsidy = subsidy < requestedSubsidy
            ? subsidy
            : requestedSubsidy;
        uint epochKey = signals.epochKey;
        uint48 epoch = signals.epoch;
        trySpendSubsidy(epoch, epochKey, receivedSubsidy);
        subsidies[epoch][epochKey] = subsidy; // don't allow a user to double request or spend more

        // Submit attestation to receiver's first epoch key
        unirep.attest(epochKey, epoch, posRepFieldIndex, receivedSubsidy);
    }

    /**
     * Accepts an action proof
     * publicSignals[0] - epoch key
     * publicSignals[1] - state tree root
     * publicSignals[2] - control0 (epoch key control)
     * publicSignals[3] - control1 (reputation control)
     * publicSignals[4,14] - reputation nullifiers
     * publicSignals[14] - not epoch key
     * publicSignals[15] - graffiti preimage
     * publicSignals[16] - data
     **/
    function publishPostSubsidy(
        bytes32 contentHash,
        uint256[17] memory publicSignals,
        uint256[8] memory proof
    ) external payable {
        // check if proof is submitted before
        bytes32 proofNullifier = keccak256(
            abi.encodePacked(publicSignals, proof)
        );
        _checkProofNullifier(proofNullifier);

        ActionSignals memory signals = decodeActionSignals(publicSignals);
        require(
            signals.revealNonce && (signals.nonce == 0),
            'Unirep Social: epoch key nonce is not valid'
        );
        require(
            verifyActionProof(publicSignals, proof),
            'Unirep Social: proof is invalid'
        );
        uint epoch = signals.epoch;
        uint epochKey = signals.epochKey;
        trySpendSubsidy(epoch, epochKey, postReputation);

        // saved post id and hashed content
        uint256 postId = contentId;
        hashedContentMapping[postId][contentHash] = epochKey;

        emit PostSubmitted(
            epoch,
            postId,
            epochKey,
            contentHash,
            signals.proveMinRep ? signals.minRep : 0 // min rep
        );

        // update content Id
        contentId++;
    }

    function publishCommentSubsidy(
        uint256 postId,
        bytes32 contentHash,
        uint256[17] memory publicSignals,
        uint256[8] memory proof
    ) external payable {
        // check if proof is submitted before
        bytes32 proofNullifier = keccak256(
            abi.encodePacked(publicSignals, proof)
        );
        _checkProofNullifier(proofNullifier);

        ActionSignals memory signals = decodeActionSignals(publicSignals);
        require(
            signals.revealNonce && (signals.nonce == 0),
            'Unirep Social: epoch key nonce is not valid'
        );
        require(
            verifyActionProof(publicSignals, proof),
            'Unirep Social: proof is invalid'
        );
        require(postId < contentId, 'Unirep Social: post ID is invalid');
        uint epoch = signals.epoch;
        uint epochKey = signals.epochKey;
        trySpendSubsidy(epoch, epochKey, commentReputation);

        // saved post id and hashed content
        uint256 commentId = contentId;
        hashedContentMapping[commentId][contentHash] = epochKey;

        emit CommentSubmitted(
            epoch,
            postId,
            epochKey,
            commentId,
            contentHash,
            signals.proveMinRep ? signals.minRep : 0 // min rep
        );

        // update content Id
        contentId++;
    }

    function voteSubsidy(
        uint256 upvoteValue,
        uint256 downvoteValue,
        uint256 toEpochKey,
        uint256[17] memory publicSignals,
        uint256[8] memory proof
    ) external payable {
        // check if proof is submitted before
        bytes32 proofNullifier = keccak256(
            abi.encodePacked(publicSignals, proof)
        );
        _checkProofNullifier(proofNullifier);

        ActionSignals memory signals = decodeActionSignals(publicSignals);
        require(
            signals.revealNonce && (signals.nonce == 0),
            'Unirep Social: epoch key nonce is not valid'
        );
        require(
            verifyActionProof(publicSignals, proof),
            'Unirep Social: proof is invalid'
        );

        uint256 voteValue = upvoteValue + downvoteValue;
        require(
            voteValue > 0,
            'Unirep Social: should submit a positive vote value'
        );
        require(
            upvoteValue * downvoteValue == 0,
            'Unirep Social: should only choose to upvote or to downvote'
        );
        require(
            signals.notEpochKey == toEpochKey,
            'Unirep Social: must prove non-ownership of epk'
        );
        uint48 epoch = signals.epoch;
        uint epochKey = signals.epochKey;
        trySpendSubsidy(epoch, epochKey, voteValue);

        // Submit attestation to receiver's epoch key
        if (upvoteValue > 0) {
            unirep.attest(
                toEpochKey,
                epoch,
                posRepFieldIndex, // field index: posRep
                upvoteValue
            );
        } else {
            unirep.attest(
                toEpochKey,
                epoch,
                negRepFieldIndex, // field index: negRep
                downvoteValue
            );
        }

        emit VoteSubmitted(
            epoch,
            epochKey, // from epoch key
            toEpochKey,
            upvoteValue,
            downvoteValue,
            signals.proveMinRep ? signals.minRep : 0 // min rep
        );
    }

    /*
     * Publish a post on chain with a reputation proof to prove that the user has enough karma to spend
     * @param contentHash The hashed content of the post
     * @param _proofRelated The reputation proof that the user proves that he has enough karma to post
     */
    function publishPost(
        bytes32 contentHash,
        uint256[17] memory publicSignals,
        uint256[8] memory proof
    ) external payable {
        // check if proof is submitted before
        bytes32 proofNullifier = keccak256(
            abi.encodePacked(publicSignals, proof)
        );
        _checkProofNullifier(proofNullifier);

        ActionSignals memory signals = decodeActionSignals(publicSignals);
        uint256 epochKey = signals.epochKey;
        require(
            verifyActionProof(publicSignals, proof),
            'Unirep Social: proof is invalid'
        );

        // Spend reputation
        uint48 epoch = signals.epoch;
        for (uint256 i = 0; i < postReputation; i++) {
            uint nullifier = signals.nullifiers[i];
            require(
                !usedRepNullifier[nullifier] && nullifier > 0,
                'Unirep Social: invalid rep nullifier'
            );
            usedRepNullifier[nullifier] = true;
        }
        unirep.attest(
            epochKey,
            epoch,
            negRepFieldIndex, // field index: posRep
            postReputation
        );

        // saved post id and hashed content
        uint256 postId = contentId;
        hashedContentMapping[postId][contentHash] = epochKey;

        emit PostSubmitted(
            epoch,
            postId,
            epochKey,
            contentHash,
            signals.proveMinRep ? signals.minRep : 0 // min rep
        );

        // update content Id
        contentId++;
    }

    /*
     * Leave a comment on chain with a reputation proof to prove that the user has enough karma to spend
     * @param postId The transaction hash of the post
     * @param contentHash The hashed content of the post
     * @param _proofRelated The reputation proof that the user proves that he has enough karma to comment
     */
    function leaveComment(
        uint256 postId,
        bytes32 contentHash,
        uint256[17] memory publicSignals,
        uint256[8] memory proof
    ) external payable {
        // check if proof is submitted before
        bytes32 proofNullifier = keccak256(
            abi.encodePacked(publicSignals, proof)
        );
        _checkProofNullifier(proofNullifier);

        ActionSignals memory signals = decodeActionSignals(publicSignals);
        uint256 epochKey = signals.epochKey;
        require(
            verifyActionProof(publicSignals, proof),
            'Unirep Social: proof is invalid'
        );
        require(postId < contentId, 'Unirep Social: post ID is invalid');

        // Spend reputation
        uint48 epoch = signals.epoch;
        for (uint256 i = 0; i < commentReputation; i++) {
            uint nullifier = signals.nullifiers[i];
            require(
                !usedRepNullifier[nullifier] && nullifier > 0,
                'Unirep Social: invalid rep nullifier'
            );
            usedRepNullifier[nullifier] = true;
        }
        unirep.attest(
            epochKey,
            epoch,
            negRepFieldIndex, // field index: posRep
            commentReputation
        );

        // saved post id and hashed content
        uint256 commentId = contentId;
        hashedContentMapping[commentId][contentHash] = epochKey;

        emit CommentSubmitted(
            epoch,
            postId,
            epochKey,
            commentId,
            contentHash,
            signals.proveMinRep ? signals.minRep : 0
        );

        // update comment Id
        contentId++;
    }

    /*
     * Update a published post/comment content
     * @param id The post ID or the comment ID
     * @param oldContentHash The old hashed content of the post/comment
     * @param newContentHash The new hashed content of the post/comment
     * @param publicSignals The public signals of the epoch key proof of the author of the post/comment
     * @param proof The epoch key proof of the author of the post/comment
     */
    function edit(
        uint256 id,
        bytes32 oldContentHash,
        bytes32 newContentHash,
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) external payable {
        // check if proof is submitted before
        bytes32 proofNullifier = keccak256(
            abi.encodePacked(publicSignals, proof)
        );
        _checkProofNullifier(proofNullifier);

        EpochKeyLiteVerifierHelper.EpochKeySignals memory signals = epkHelper
            .decodeEpochKeyLiteSignals(publicSignals);
        epkHelper.verifyAndCheck(publicSignals, proof);
        require(id < contentId, 'Unirep Social: content ID is invalid');
        require(
            hashedContentMapping[id][oldContentHash] == signals.epochKey,
            'Unirep Social: Mismatched epoch key proof to the post or the comment id'
        );

        hashedContentMapping[id][oldContentHash] = 0;
        hashedContentMapping[id][newContentHash] = signals.epochKey;

        emit ContentUpdated(id, oldContentHash, newContentHash);
    }

    /*
     * Vote an epoch key with a reputation proof to prove that the user has enough karma to spend
     * @param upvoteValue How much the user wants to upvote the epoch key receiver
     * @param downvoteValue How much the user wants to downvote the epoch key receiver
     * @param toEpochKey The vote receiver
     * @param toEPochKeyProofIndex the proof index of the epoch key on unirep
     * @param _proofRelated The reputation proof that the user proves that he has enough karma to vote
     */
    function vote(
        uint256 upvoteValue,
        uint256 downvoteValue,
        uint256 toEpochKey,
        uint256[17] memory publicSignals,
        uint256[8] memory proof
    ) external payable {
        uint256 voteValue = upvoteValue + downvoteValue;
        // check if proof is submitted before
        bytes32 proofNullifier = keccak256(
            abi.encodePacked(publicSignals, proof)
        );
        _checkProofNullifier(proofNullifier);
        require(
            voteValue > 0,
            'Unirep Social: should submit a positive vote value'
        );
        require(
            upvoteValue * downvoteValue == 0,
            'Unirep Social: should only choose to upvote or to downvote'
        );

        ActionSignals memory signals = decodeActionSignals(publicSignals);
        require(
            verifyActionProof(publicSignals, proof),
            'Unirep Social: proof is invalid'
        );

        // Spend reputation
        uint48 epoch = signals.epoch;
        for (uint256 i = 0; i < voteValue; i++) {
            uint nullifier = signals.nullifiers[i];
            require(
                !usedRepNullifier[nullifier] && nullifier > 0,
                'Unirep Social: invalid rep nullifier'
            );
            usedRepNullifier[nullifier] = true;
        }
        unirep.attest(
            signals.epochKey,
            epoch,
            negRepFieldIndex, // field index: posRep
            voteValue
        );

        // Submit attestation to receiver's epoch key
        // Submit attestation to receiver's epoch key
        if (upvoteValue > 0) {
            unirep.attest(
                toEpochKey,
                epoch,
                posRepFieldIndex, // field index: posRep
                upvoteValue
            );
        } else {
            unirep.attest(
                toEpochKey,
                epoch,
                negRepFieldIndex, // field index: negRep
                downvoteValue
            );
        }

        emit VoteSubmitted(
            epoch,
            signals.epochKey, // from epoch key
            toEpochKey,
            upvoteValue,
            downvoteValue,
            signals.proveMinRep ? signals.minRep : 0
        );
    }

    /*
     * Set new user name for an epochKey
     * @param epochKey epoch key that attempts to set a new uername
     * @param oldUsername oldusername that the eppch key previously claimed
     * @param newUsername requested new user name
     */
    function setUsername(
        uint256 epochKey,
        uint256 oldUsername,
        uint256 newUsername
    ) external payable {
        // check if the new username is not taken
        require(
            usernames[newUsername] == false,
            'Unirep Social: This username is already taken'
        );

        // only admin can call this function
        require(
            msg.sender == admin,
            'Unirep Social: Only admin can send transactions to this contract'
        );

        usernames[oldUsername] = false;
        usernames[newUsername] = true;

        uint48 epoch = unirep.attesterCurrentEpoch(attesterId);

        // attest to the epoch key to give the key the username
        unirep.attest(
            epochKey,
            epoch,
            graffitiFieldIndex, // field index: graffiti
            newUsername
        );
    }
}
