// SPDX-License-Identifier: UNLICENSED
pragma abicoder v2;
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import { Unirep } from "@unirep/contracts/Unirep.sol";
import { Interep } from "@interep/contracts/Interep.sol";
import "@appliedzkp/semaphore-contracts/interfaces/IVerifier.sol";

contract UnirepSocial is Interep {
    using SafeMath for uint256;

    Unirep public unirep;

    // Before Unirep integrates with InterRep
    // We use an admin to controll user sign up
    address internal admin;

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
        uint256[] publicSignals,
        uint256[8] proof
    );

    event PostSubmitted(
        uint256 indexed _epoch,
        uint256 indexed _epochKey,
        string _postContent,
        uint256[] publicSignals,
        uint256[8] proof
    );

    event CommentSubmitted(
        uint256 indexed _epoch,
        uint256 indexed _postId,
        uint256 indexed _epochKey,
        string _commentContent,
        uint256[] publicSignals,
        uint256[8] proof
    );

    event VoteSubmitted(
        uint256 indexed _epoch,
        uint256 indexed _fromEpochKey,
        uint256 indexed _toEpochKey,
        uint256 upvoteValue,
        uint256 downvoteValue,
        uint256 toEpochKeyProofIndex,
        uint256[] publicSignals,
        uint256[8] proof
    );

    constructor(
        Unirep _unirepContract,
        uint256 _postReputation,
        uint256 _commentReputation,
        uint256 _airdroppedReputation,
        Verifier[] memory interepVerifiers
    ) Interep(interepVerifiers) {
        // Set the unirep contracts
        unirep = _unirepContract;
        // Set admin user
        admin = msg.sender;

        // signup Unirep Social contract as an attester in Unirep contract
        unirep.attesterSignUp();
        unirep.setAirdropAmount(_airdroppedReputation);
        attesterId = unirep.attesters(address(this));

        postReputation = _postReputation;
        commentReputation = _commentReputation;
        airdroppedReputation = _airdroppedReputation;
    }

    /*
     * Call Unirep contract to perform user signing up if user hasn't signed up in Unirep
     * @param _identityCommitment Commitment of the user's identity which is a semaphore identity.
     */
    function userSignUp(uint256 _identityCommitment) external {
        require(msg.sender == admin, "Unirep Social: sign up should through an admin");
        unirep.userSignUp(_identityCommitment);

        emit UserSignedUp(
            unirep.currentEpoch(),
            _identityCommitment
        );
    }

    /*
     * Give a user sign up flag if user has already signed up in Unirep but not Unirep Social
     * @param _signUpProofData A sign up proof indicates that the user has not signed up in Unirep Social
     */
    // function userSignUpWithProof(Unirep.SignUpProofRelated memory _signUpProofData) external payable {
    //     require(isEpochKeyGotAirdrop[_signUpProofData.epochKey] == false, "Unirep Social: the epoch key has been airdropped");
    //     require(_signUpProofData.attesterId == attesterId, "Unirep Social: submit a proof with different attester ID from Unirep Social");
    //     require(_signUpProofData.userHasSignedUp == 0, "Unirep Social: user should not sign up in Unirep Social before");

    //     // Submit airdrop
    //     unirep.airdropEpochKey{value: unirep.attestingFee()}(_signUpProofData);

    //     // Set the epoch key has been airdropped
    //     isEpochKeyGotAirdrop[_signUpProofData.epochKey] = true;

    //     emit AirdropSubmitted(
    //         unirep.currentEpoch(),
    //         _signUpProofData.epochKey,
    //         _signUpProofData
    //     );
    // }

    /*
     * Publish a post on chain with a reputation proof to prove that the user has enough karma to spend
     * @param content The text content of the post
     * @param _proofRelated The reputation proof that the user proves that he has enough karma to post
     */
    function publishPost(
        string memory content,
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) external payable {
        (,,,,uint maxReputationBudget,,,uint attestingFee,,) = unirep.config();
        require(publicSignals[maxReputationBudget + 4] == postReputation, "Unirep Social: submit different nullifiers amount from the required amount for post");
        require(publicSignals[maxReputationBudget + 3] == attesterId, "Unirep Social: submit a proof with different attester ID from Unirep Social");

        // Spend reputation
        unirep.spendReputation{value: attestingFee}(publicSignals, proof);

        emit PostSubmitted(
            unirep.currentEpoch(),
            publicSignals[0], // epoch key
            content,
            publicSignals,
            proof
        );
    }

    /*
     * Leave a comment on chain with a reputation proof to prove that the user has enough karma to spend
     * @param postId The transaction hash of the post
     * @param content The text content of the post
     * @param _proofRelated The reputation proof that the user proves that he has enough karma to comment
     */
    function leaveComment(
        uint256 postId,
        string memory content,
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) external payable {
        (,,,,uint maxReputationBudget,,,uint attestingFee,,) = unirep.config();
        require(publicSignals[maxReputationBudget + 4] == commentReputation, "Unirep Social: submit different nullifiers amount from the required amount for comment");
        require(publicSignals[maxReputationBudget + 3] == attesterId, "Unirep Social: submit a proof with different attester ID from Unirep Social");

        // Spend reputation
        unirep.spendReputation{value: attestingFee}(publicSignals, proof);

        emit CommentSubmitted(
            unirep.currentEpoch(),
            postId,
            publicSignals[0], // epoch key
            content,
            publicSignals,
            proof
        );
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
        uint256 toEpochKeyProofIndex,
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) external payable {
        (,,,,uint maxReputationBudget,,,uint attestingFee,,) = unirep.config();
        uint256 voteValue = upvoteValue + downvoteValue;
        require(voteValue > 0, "Unirep Social: should submit a positive vote value");
        require(upvoteValue * downvoteValue == 0, "Unirep Social: should only choose to upvote or to downvote");
        require(publicSignals[maxReputationBudget + 4] == voteValue, "Unirep Social: submit different nullifiers amount from the vote value");
        require(publicSignals[maxReputationBudget + 3] == attesterId, "Unirep Social: submit a proof with different attester ID from Unirep Social");

        // Spend reputation
        unirep.spendReputation{value: attestingFee}(publicSignals, proof);
        bytes32 repProofHash = keccak256(
            abi.encodePacked(publicSignals, proof)
        );
        uint256 repProofIndex = unirep.getProofIndex(repProofHash);

        // Submit attestation to receiver's epoch key
        Unirep.Attestation memory attestation;
        attestation.attesterId = attesterId;
        attestation.posRep = upvoteValue;
        attestation.negRep = downvoteValue;
        unirep.submitAttestation{value: attestingFee}(
            attestation,
            toEpochKey,
            toEpochKeyProofIndex,
            repProofIndex
        );

        emit VoteSubmitted(
            unirep.currentEpoch(),
            publicSignals[0], // epoch key
            toEpochKey,
            upvoteValue,
            downvoteValue,
            toEpochKeyProofIndex,
            publicSignals,
            proof
        );
    }

    /*
     * Give a user airdrop if user has already signed up in Unirep Social
     * @param _signUpProofData A sign up proof indicates that the user has signed up in Unirep Social
     */
    function airdrop(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) external payable {
        require(isEpochKeyGotAirdrop[publicSignals[1]] == false, "Unirep Social: the epoch key has been airdropped");
        require(publicSignals[3] == attesterId, "Unirep Social: submit a proof with different attester ID from Unirep Social");
        require(publicSignals[4] == 1, "Unirep Social: user should have signed up in Unirep Social before");

        // Submit airdrop
        (,,,,,,,uint attestingFee,,) = unirep.config();
        unirep.airdropEpochKey{value: attestingFee}(publicSignals, proof);

        // Set the epoch key has been airdropped
        isEpochKeyGotAirdrop[publicSignals[1]] = true;

        emit AirdropSubmitted(
            unirep.currentEpoch(),
            publicSignals[1], // epoch key
            publicSignals,
            proof
        );
    }

    /*
     * Call Unirep contract to perform start user state transition
     * @param _blindedUserState Blind user state tree before user state transition
     * @param _blindedHashChain Blind hash chain before user state transition
     * @param _GSTRoot User proves that he has already signed up in the global state tree
     * @param _proof The snark proof
     */
    function startUserStateTransition(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) external {
        unirep.startUserStateTransition(publicSignals, proof);
    }

    /*
     * Call Unirep contract to perform user state transition
     * @param _outputBlindedUserState Blind intermediate user state tree before user state transition
     * @param _outputBlindedHashChain Blind intermediate hash chain before user state transition
     * @param _inputBlindedUserState Input a submitted blinded user state before process the proof
     * @param _proof The snark proof
     */
    function processAttestations(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) external {
        unirep.processAttestations(publicSignals, proof);
    }

    /*
     * Call Unirep contract to perform user state transition
     * @param userTransitionedData The public signals and proof of the user state transition
     * @param proofIndexes The proof indexes of start user state transition and process attestations
     */
    function updateUserStateRoot(
        uint256[] memory publicSignals,
        uint256[8] memory proof,
        uint256[] memory proofIndexRecords
    ) external {
        unirep.updateUserStateRoot(publicSignals, proof, proofIndexRecords);
    }
}
