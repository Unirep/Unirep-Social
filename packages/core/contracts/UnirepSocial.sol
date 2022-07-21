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
        unirep.setAirdropAmount(_airdroppedReputation);
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
        unirep.userSignUp(_identityCommitment);

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
        require(publicSignals[numEpochKeyNoncePerEpoch + 2] == attesterId, "Unirep Social: submit a proof with different attester ID from Unirep Social");

        // verify the proof
        require(isValidSignals(publicSignals));
        require(negativeReputationVerifier.verifyProof(proof, publicSignals));

        // update the stored subsidy balances
        uint maxSubsidy = numEpochKeyNoncePerEpoch * epkSubsidy;
        uint requestedSubsidy = publicSignals[numEpochKeyNoncePerEpoch + 3];
        uint receivedSubsidy = maxSubsidy < requestedSubsidy ? maxSubsidy : requestedSubsidy;
        uint totalSpent = 0;
        // spend from each epoch key until we get to receivedSubsidy
        for (uint x = 0; x < numEpochKeyNoncePerEpoch; x++) {
            uint remaining = receivedSubsidy - totalSpent;
            if (remaining == 0) break;
            uint spend = epkSubsidy > remaining ? remaining : epkSubsidy;
            trySpendSubsidy(publicSignals[numEpochKeyNoncePerEpoch + 1], publicSignals[x], spend);
            totalSpent += spend;
        }

        // Submit attestation to receiver's first epoch key
        Unirep.Attestation memory attestation;
        attestation.attesterId = attesterId;
        attestation.posRep = receivedSubsidy;
        attestation.negRep = 0;
        // TODO: waiting on PR
        // unirep.submitGSTAttestation{value: attestingFee}(
        //     attestation,
        //     publicSignals[0], // first epoch key
        //     publicSignals[numEpochKeyNoncePerEpoch] // GST root
        // );
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

        uint256 epoch = publicSignals[maxReputationBudget];
        uint256 epochKey = publicSignals[maxReputationBudget + 1];
        uint256 proofSpendAmount = publicSignals[maxReputationBudget + 4];
        require(proofSpendAmount <= postReputation, "Unirep Social: submit different nullifiers amount from the required amount for post");
        uint256 requestedSubsidy = postReputation - proofSpendAmount;
        if (requestedSubsidy > 0) {
            require(unirep.verifyReputation(publicSignals, proof), "Unirep Social: invalid reputation proof");
            trySpendSubsidy(epoch, epochKey, requestedSubsidy);
            Unirep.Attestation memory attestation;
            attestation.attesterId = attesterId;
            attestation.negRep = publicSignals[maxReputationBudget + 4];
            // TODO: uncomment when the relevant pr is merged
            // unirep.submitGSTAttestation{value: attestingFee}(
            //   attestation,
            //   publicSignals[0], // epoch key
            //   publicSignals[1] // gst root
            // );
        } else {
          // Spend reputation
          unirep.spendReputation{value: attestingFee}(publicSignals, proof);
        }

        emit PostSubmitted(
            unirep.currentEpoch(),
            epochKey,
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
        require(publicSignals[maxReputationBudget + 3] == attesterId, "Unirep Social: submit a proof with different attester ID from Unirep Social");

        uint256 epoch = publicSignals[maxReputationBudget];
        uint256 epochKey = publicSignals[maxReputationBudget + 1];
        uint256 proofSpendAmount = publicSignals[maxReputationBudget + 4];
        require(proofSpendAmount <= commentReputation, "Unirep Social: submit different nullifiers amount from the required amount for comment");
        uint256 requestedSubsidy = commentReputation - proofSpendAmount;
        if (requestedSubsidy > 0) {
            require(unirep.verifyReputation(publicSignals, proof), "Unirep Social: invalid reputation proof");
            trySpendSubsidy(epoch, epochKey, requestedSubsidy);
            Unirep.Attestation memory attestation;
            attestation.attesterId = attesterId;
            attestation.negRep = publicSignals[maxReputationBudget + 4];
            // TODO: uncomment when the relevant pr is merged
            // unirep.submitGSTAttestation{value: attestingFee}(
            //   attestation,
            //   publicSignals[0], // epoch key
            //   publicSignals[1] // gst root
            // );
        } else {
          // Spend reputation
          unirep.spendReputation{value: attestingFee}(publicSignals, proof);
        }

        emit CommentSubmitted(
            unirep.currentEpoch(),
            postId,
            epochKey, // epoch key
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
        require(publicSignals[maxReputationBudget + 3] == attesterId, "Unirep Social: submit a proof with different attester ID from Unirep Social");

        {
            uint256 epoch = publicSignals[maxReputationBudget];
            uint256 epochKey = publicSignals[maxReputationBudget + 1];
            uint256 proofSpendAmount = publicSignals[maxReputationBudget + 4];
            require(proofSpendAmount <= voteValue, "Unirep Social: submit different nullifiers amount from the vote value");
            uint256 requestedSubsidy = voteValue - proofSpendAmount;
            if (requestedSubsidy > 0) {
                require(unirep.verifyReputation(publicSignals, proof), "Unirep Social: invalid reputation proof");
                trySpendSubsidy(epoch, epochKey, requestedSubsidy);
                Unirep.Attestation memory attestation;
                attestation.attesterId = attesterId;
                attestation.negRep = publicSignals[maxReputationBudget + 4];
                // TODO: uncomment when the relevant pr is merged
                // unirep.submitGSTAttestation{value: attestingFee}(
                //   attestation,
                //   publicSignals[0], // epoch key
                //   publicSignals[1] // gst root
                // );
            } else {
              // Spend reputation
              unirep.spendReputation{value: attestingFee}(publicSignals, proof);
            }
        }

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
            publicSignals[maxReputationBudget + 1], // epoch key
            toEpochKey,
            upvoteValue,
            downvoteValue,
            toEpochKeyProofIndex,
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
