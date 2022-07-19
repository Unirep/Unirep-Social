// SPDX-License-Identifier: UNLICENSED
pragma abicoder v2;
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import { Unirep } from "@unirep/contracts/Unirep.sol";
import { IVerifier } from "@unirep/contracts/interfaces/IVerifier.sol";
import { zkSNARKHelper } from '@unirep/contracts/libraries/zkSNARKHelper.sol';

contract UnirepSocial is zkSNARKHelper {
    using SafeMath for uint256;

    Unirep public unirep;
    IVerifier internal negativeReputationVerifier;

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

    // A mapping between username and if they're already claimed;
    mapping(uint256 => bool) public usernames;
    // epoch number to epoch key to amount spent
    mapping(uint256 => mapping(uint256 => uint256)) public subsidies;

    uint256 immutable public epkSubsidy;

    // help Unirep Social track event
    event UserSignedUp(
        uint256 indexed _epoch,
        uint256 indexed _identityCommitment
    );

    event AirdropSubmitted(
        uint256 indexed _epoch,
        uint256 indexed _epochKey
    );

    event PostSubmitted(
        uint256 indexed _epoch,
        uint256 indexed _epochKey,
        string _postContent,
        uint256 minRep
    );

    event CommentSubmitted(
        uint256 indexed _epoch,
        uint256 indexed _postId,
        uint256 indexed _epochKey,
        string _commentContent,
        uint256 minRep
    );

    event VoteSubmitted(
        uint256 indexed _epoch,
        uint256 indexed _fromEpochKey,
        uint256 indexed _toEpochKey,
        uint256 upvoteValue,
        uint256 downvoteValue,
        uint256 minRep
    );


    constructor(
        Unirep _unirepContract,
        IVerifier _negativeReputationVerifier,
        uint256 _postReputation,
        uint256 _commentReputation,
        uint256 _airdroppedReputation,
        uint256 _epkSubsidy
    ) {
        // Set the unirep contracts
        unirep = _unirepContract;
        negativeReputationVerifier = _negativeReputationVerifier;
        // Set admin user
        admin = msg.sender;

        // signup Unirep Social contract as an attester in Unirep contract
        unirep.attesterSignUp();
        attesterId = unirep.attesters(address(this));

        postReputation = _postReputation;
        commentReputation = _commentReputation;
        airdroppedReputation = _airdroppedReputation;
        epkSubsidy = _epkSubsidy;
    }

    /*
     * Call Unirep contract to perform user signing up if user hasn't signed up in Unirep
     * @param _identityCommitment Commitment of the user's identity which is a semaphore identity.
     */
    function userSignUp(uint256 _identityCommitment) external {
        require(msg.sender == admin, "Unirep Social: sign up should through an admin");
        unirep.userSignUp(_identityCommitment, airdroppedReputation);

        emit UserSignedUp(
            unirep.currentEpoch(),
            _identityCommitment
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
      uint256 epochKey,
      uint256 amount
    ) private {
        uint256 spentSubsidy = subsidies[epoch][epochKey];
        assert(spentSubsidy <= epkSubsidy);
        uint256 remainingSubsidy = epkSubsidy - spentSubsidy;
        require(amount <= remainingSubsidy, 'Unirep Social: requesting too much subsidy');
        require(epoch == unirep.currentEpoch(), 'Unirep Social: wrong epoch');
        subsidies[epoch][epochKey] += amount;
    }

    /**
     * Accepts a negative reputation proof
     **/
    function getSubsidyAirdrop(
      uint256[] memory publicSignals,
      uint256[8] memory proof
    ) public {
        (,,,uint numEpochKeyNoncePerEpoch,uint maxReputationBudget,,,uint attestingFee,,) = unirep.config();
        require(publicSignals[numEpochKeyNoncePerEpoch + 3] == attesterId, "Unirep Social: submit a proof with different attester ID from Unirep Social");

        // verify the proof
        require(isValidSignals(publicSignals));
        require(negativeReputationVerifier.verifyProof(proof, publicSignals));

        // update the stored subsidy balances
        uint maxSubsidy = numEpochKeyNoncePerEpoch * epkSubsidy;
        uint requestedSubsidy = publicSignals[numEpochKeyNoncePerEpoch + 1];
        uint receivedSubsidy = maxSubsidy < requestedSubsidy ? maxSubsidy : requestedSubsidy;
        uint totalSpent = 0;
        uint epoch = publicSignals[numEpochKeyNoncePerEpoch + 2];
        // spend from each epoch key until we get to receivedSubsidy
        for (uint x = 0; x < numEpochKeyNoncePerEpoch; x++) {
            uint remaining = receivedSubsidy - totalSpent;
            if (remaining == 0) break;
            uint spend = epkSubsidy > remaining ? remaining : epkSubsidy;
            trySpendSubsidy(epoch, publicSignals[x], spend);
            totalSpent += spend;
        }
        require(unirep.globalStateTreeRoots(epoch, publicSignals[numEpochKeyNoncePerEpoch]), "Unirep Social: GST root does not exist in epoch");

        // Submit attestation to receiver's first epoch key
        Unirep.Attestation memory attestation;
        attestation.attesterId = attesterId;
        attestation.posRep = receivedSubsidy;
        attestation.negRep = 0;
        // TODO: waiting on PR
        unirep.submitAttestation{value: attestingFee}(
            attestation,
            publicSignals[0] // first epoch key
        );
    }

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
        require(publicSignals[maxReputationBudget + 3] == attesterId, "Unirep Social: submit a proof with different attester ID from Unirep Social");

        uint256 epoch = publicSignals[maxReputationBudget + 2];
        uint256 epochKey = publicSignals[0];
        uint256 proofSpendAmount = publicSignals[maxReputationBudget + 4];
        require(proofSpendAmount <= postReputation, "Unirep Social: submit different nullifiers amount from the required amount for post");
        uint256 requestedSubsidy = postReputation - proofSpendAmount;
        if (requestedSubsidy > 0) {
            trySpendSubsidy(epoch, epochKey, requestedSubsidy);
        }

        // Spend reputation
        unirep.spendReputation{value: attestingFee}(publicSignals, proof);

        emit PostSubmitted(
            unirep.currentEpoch(),
            epochKey,
            content,
            publicSignals[maxReputationBudget + 5] // min rep
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
        require(publicSignals[maxReputationBudget + 3] == attesterId, "Unirep Social: submit a proof with different attester ID from Unirep Social");

        uint256 epoch = publicSignals[maxReputationBudget + 2];
        uint256 epochKey = publicSignals[0];
        uint256 proofSpendAmount = publicSignals[maxReputationBudget + 4];
        require(proofSpendAmount <= commentReputation, "Unirep Social: submit different nullifiers amount from the required amount for comment");
        uint256 requestedSubsidy = commentReputation - proofSpendAmount;
        if (requestedSubsidy > 0) {
            trySpendSubsidy(epoch, epochKey, requestedSubsidy);
        }

        // Spend reputation
        unirep.spendReputation{value: attestingFee}(publicSignals, proof);

        emit CommentSubmitted(
            unirep.currentEpoch(),
            postId,
            epochKey, // epoch key
            content,
            publicSignals[maxReputationBudget + 5] // min rep
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
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) external payable {
        (,,,,uint maxReputationBudget,,,uint attestingFee,,) = unirep.config();
        uint256 voteValue = upvoteValue + downvoteValue;
        require(voteValue > 0, "Unirep Social: should submit a positive vote value");
        require(upvoteValue * downvoteValue == 0, "Unirep Social: should only choose to upvote or to downvote");
        require(publicSignals[maxReputationBudget + 3] == attesterId, "Unirep Social: submit a proof with different attester ID from Unirep Social");

        {
            uint256 epoch = publicSignals[maxReputationBudget + 2];
            uint256 epochKey = publicSignals[0];
            uint256 proofSpendAmount = publicSignals[maxReputationBudget + 4];
            require(proofSpendAmount <= voteValue, "Unirep Social: submit different nullifiers amount from the vote value");
            uint256 requestedSubsidy = voteValue - proofSpendAmount;
            if (requestedSubsidy > 0) {
                trySpendSubsidy(epoch, epochKey, requestedSubsidy);
            }
        }
        // Spend reputation
        unirep.spendReputation{value: attestingFee}(publicSignals, proof);

        // Submit attestation to receiver's epoch key
        Unirep.Attestation memory attestation;
        attestation.attesterId = attesterId;
        attestation.posRep = upvoteValue;
        attestation.negRep = downvoteValue;
        unirep.submitAttestation{value: attestingFee}(
            attestation,
            toEpochKey
        );

        emit VoteSubmitted(
            unirep.currentEpoch(),
            publicSignals[0], // from epoch key
            toEpochKey,
            upvoteValue,
            downvoteValue,
            publicSignals[maxReputationBudget + 5] // min rep
        );
    }

    /*
     * Give a user airdrop if user has already signed up in Unirep Social
     * @param _signUpProofData A sign up proof indicates that the user has signed up in Unirep Social
     */
    // function airdrop(
    //     uint256[] memory publicSignals,
    //     uint256[8] memory proof
    // ) external payable {
    //     require(isEpochKeyGotAirdrop[publicSignals[1]] == false, "Unirep Social: the epoch key has been airdropped");
    //     require(publicSignals[3] == attesterId, "Unirep Social: submit a proof with different attester ID from Unirep Social");
    //     require(publicSignals[4] == 1, "Unirep Social: user should have signed up in Unirep Social before");

    //     // Submit airdrop
    //     (,,,,,,,uint attestingFee,,) = unirep.config();
    //     unirep.airdropEpochKey{value: attestingFee}(publicSignals, proof);

    //     // Set the epoch key has been airdropped
    //     isEpochKeyGotAirdrop[publicSignals[1]] = true;

    //     emit AirdropSubmitted(
    //         unirep.currentEpoch(),
    //         publicSignals[1], // epoch key
    //         publicSignals,
    //         proof
    //     );
    // }

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
        uint256[8] memory proof
    ) external {
        unirep.updateUserStateRoot(publicSignals, proof);
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
        uint attestingFee = unirep.attestingFee();

        // check if the new username is not taken
        require(usernames[newUsername] == false, "This username is already taken");

        // only admin can call this function
        require(msg.sender == admin, "Only admin can send transactions to this contract");

        usernames[oldUsername] = false;
        usernames[newUsername] = true;

        // attest to the epoch key to give the key the username
        Unirep.Attestation memory attestation;
        attestation.attesterId = attesterId;
        attestation.posRep = 0;
        attestation.negRep = 0;
        attestation.graffiti = newUsername;

        unirep.submitAttestation{value: attestingFee}(
            attestation,
            epochKey
        );
     }
}
