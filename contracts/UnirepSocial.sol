// SPDX-License-Identifier: UNLICENSED
pragma abicoder v2;
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import { Unirep } from "unirep/contracts/Unirep.sol";

contract UnirepSocial {
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
        uint256 indexed epoch,
        uint256 indexed identityCommitment
    );

    event AirdropSubmitted(
        uint256 indexed epoch,
        uint256 indexed epochKey,
        Unirep.SignUpProof proofRelated
    );

    event PostSubmitted(
        uint256 indexed epoch,
        uint256 indexed epochKey,
        string postContent,
        Unirep.ReputationProof proofRelated
    );

    event CommentSubmitted(
        uint256 indexed epoch,
        uint256 indexed postId,
        uint256 indexed epochKey,
        string commentContent,
        Unirep.ReputationProof proofRelated
    );

    event VoteSubmitted(
        uint256 indexed epoch,
        uint256 indexed fromEpochKey,
        uint256 indexed toEpochKey,
        uint256 upvoteValue,
        uint256 downvoteValue,
        uint256 toEpochKeyProofIndex,
        Unirep.ReputationProof proofRelated
    );

    constructor(
        Unirep _unirepContract,
        uint256 _postReputation,
        uint256 _commentReputation,
        uint256 _airdroppedReputation
    ) {
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
     * @param identityCommitment Commitment of the user's identity which is a semaphore identity.
     */
    function userSignUp(uint256 identityCommitment) external {
        require(
            msg.sender == admin,
            "Unirep Social: sign up should through an admin"
        );
        unirep.userSignUp(identityCommitment);

        emit UserSignedUp(
            unirep.currentEpoch(),
            identityCommitment
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
     * @param proofRelated The reputation proof that the user proves that he has enough karma to post
     */
    function publishPost(
        string memory content,
        Unirep.ReputationProof memory proofRelated
    ) external payable {
        require(
            proofRelated.proveReputationAmount == postReputation,
            "Unirep Social: submit different nullifiers amount from the required amount for post"
        );
        require(
            proofRelated.attesterId == attesterId,
            "Unirep Social: submit a proof with different attester ID from Unirep Social"
        );

        // Spend reputation
        unirep.spendReputation{value: unirep.attestingFee()}(proofRelated);

        emit PostSubmitted(
            unirep.currentEpoch(),
            proofRelated.epochKey,
            content,
            proofRelated
        );
    }

    /*
     * Leave a comment on chain with a reputation proof to prove that the user has enough karma to spend
     * @param postId The transaction hash of the post
     * @param content The text content of the post
     * @param proofRelated The reputation proof that the user proves that he has enough karma to comment
     */
    function leaveComment(
        uint256 postId,
        string memory content,
        Unirep.ReputationProof memory proofRelated
    ) external payable {
        require(
            proofRelated.proveReputationAmount == commentReputation,
            "Unirep Social: submit different nullifiers amount from the required amount for comment"
        );
        require(
            proofRelated.attesterId == attesterId,
            "Unirep Social: submit a proof with different attester ID from Unirep Social"
        );

        // Spend reputation
        unirep.spendReputation{value: unirep.attestingFee()}(proofRelated);

        emit CommentSubmitted(
            unirep.currentEpoch(),
            postId,
            proofRelated.epochKey,
            content,
            proofRelated
        );
    }

    /*
     * Vote an epoch key with a reputation proof to prove that the user has enough karma to spend
     * @param upvoteValue How much the user wants to upvote the epoch key receiver
     * @param downvoteValue How much the user wants to downvote the epoch key receiver
     * @param toEpochKey The vote receiver
     * @param toEPochKeyProofIndex the proof index of the epoch key on unirep
     * @param proofRelated The reputation proof that the user proves that he has enough karma to vote
     */
    function vote(
        uint256 upvoteValue,
        uint256 downvoteValue,
        uint256 toEpochKey,
        uint256 toEpochKeyProofIndex,
        Unirep.ReputationProof memory proofRelated
    ) external payable {
        uint256 voteValue = upvoteValue + downvoteValue;
        require(
            voteValue > 0,
            "Unirep Social: should submit a positive vote value"
        );
        require(
            upvoteValue * downvoteValue == 0,
            "Unirep Social: should only choose to upvote or to downvote"
        );
        require(
            proofRelated.proveReputationAmount == voteValue,
            "Unirep Social: submit different nullifiers amount from the vote value"
        );
        require(
            proofRelated.attesterId == attesterId,
            "Unirep Social: submit a proof with different attester ID from Unirep Social"
        );

        // Spend reputation
        unirep.spendReputation{value: unirep.attestingFee()}(proofRelated);
        bytes32 repProofHash = unirep.hashReputationProof(proofRelated);
        uint256 repProofIndex = unirep.getProofIndex(repProofHash);

        // Submit attestation to receiver's epoch key
        Unirep.Attestation memory attestation;
        attestation.attesterId = attesterId;
        attestation.posRep = upvoteValue;
        attestation.negRep = downvoteValue;
        unirep.submitAttestation{value: unirep.attestingFee()}(
            attestation,
            toEpochKey,
            toEpochKeyProofIndex,
            repProofIndex
        );

        emit VoteSubmitted(
            unirep.currentEpoch(),
            proofRelated.epochKey,
            toEpochKey,
            upvoteValue,
            downvoteValue,
            toEpochKeyProofIndex,
            proofRelated
        );
    }

    /*
     * Give a user airdrop if user has already signed up in Unirep Social
     * @param signUpProofData A sign up proof indicates that the user has signed up in Unirep Social
     */
    function airdrop(
        Unirep.SignUpProof memory signUpProofData
    ) external payable {
        require(
            isEpochKeyGotAirdrop[signUpProofData.epochKey] == false,
            "Unirep Social: the epoch key has been airdropped"
        );
        require(
            signUpProofData.attesterId == attesterId,
            "Unirep Social: submit a proof with different attester ID from Unirep Social"
        );
        require(
            signUpProofData.userHasSignedUp == 1,
            "Unirep Social: user should have signed up in Unirep Social before"
        );

        // Submit airdrop
        unirep.airdropEpochKey{value: unirep.attestingFee()}(signUpProofData);

        // Set the epoch key has been airdropped
        isEpochKeyGotAirdrop[signUpProofData.epochKey] = true;

        emit AirdropSubmitted(
            unirep.currentEpoch(),
            signUpProofData.epochKey,
            signUpProofData
        );
    }

    /*
     * Call Unirep contract to perform start user state transition
     * @param blindedUserState Blind user state tree before user state transition
     * @param blindedHashChain Blind hash chain before user state transition
     * @param GSTRoot User proves that he has already signed up in the global state tree
     * @param proof The snark proof
     */
    function startUserStateTransition(
        uint256 blindedUserState,
        uint256 blindedHashChain,
        uint256 GSTRoot,
        uint256[8] calldata proof
    ) external {
        unirep.startUserStateTransition(
            blindedUserState,
            blindedHashChain,
            GSTRoot,
            proof
        );
    }

    /*
     * Call Unirep contract to perform user state transition
     * @param outputBlindedUserState Blind intermediate user state tree before user state transition
     * @param outputBlindedHashChain Blind intermediate hash chain before user state transition
     * @param inputBlindedUserState Input a submitted blinded user state before process the proof
     * @param proof The snark proof
     */
    function processAttestations(
        uint256 outputBlindedUserState,
        uint256 outputBlindedHashChain,
        uint256 inputBlindedUserState,
        uint256[8] calldata proof
    ) external {
        unirep.processAttestations(
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            proof
        );
    }

    /*
     * Call Unirep contract to perform user state transition
     * @param userTransitionedData The public signals and proof of the user state transition
     * @param proofIndexes The proof indexes of start user state transition and process attestations
     */
    function updateUserStateRoot(
        Unirep.UserTransitionProof memory userTransitionedData,
        uint256[] memory proofIndexes
    ) external {
        unirep.updateUserStateRoot(
            userTransitionedData,
            proofIndexes
        );
    }
}
