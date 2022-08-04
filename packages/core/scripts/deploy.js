const { deployUnirep } = require('@unirep/contracts')
const UnirepSocial = require('../artifacts/contracts/UnirepSocial.sol/UnirepSocial.json')
const SemaphoreVerifier = require('../artifacts/contracts/SemaphoreVerifier.sol/SemaphoreVerifier.json')
const {
    GLOBAL_STATE_TREE_DEPTH,
    USER_STATE_TREE_DEPTH,
    EPOCH_TREE_DEPTH,
} = require('@unirep/circuits')

const attestingFee = ethers.utils.parseEther('0.000000000001')
const numEpochKeyNoncePerEpoch = 3
const numAttestationsPerProof = 5
const epochLength = 15 * 60 // seconds
const maxReputationBudget = 10
const maxUsers = 2 ** GLOBAL_STATE_TREE_DEPTH - 1
const maxAttesters = 2 ** USER_STATE_TREE_DEPTH - 1

;(async () => {
    const [signer] = await ethers.getSigners()
    const unirep = await deployUnirep(signer, {
        attestingFee,
        numEpochKeyNoncePerEpoch,
        numAttestationsPerProof,
        epochLength,
        globalStateTreeDepth: GLOBAL_STATE_TREE_DEPTH,
        userStateTreeDepth: USER_STATE_TREE_DEPTH,
        epochTreeDepth: EPOCH_TREE_DEPTH,
        maxReputationBudget,
        maxUsers,
        maxAttesters,
    })
    const SemaphoreVerifierF = new ethers.ContractFactory(
        SemaphoreVerifier.abi,
        SemaphoreVerifier.bytecode,
        signer
    )
    const verifier = await SemaphoreVerifierF.deploy()
    await verifier.deployed()
    const UnirepSocialF = new ethers.ContractFactory(
        UnirepSocial.abi,
        UnirepSocial.bytecode,
        signer
    )
    const postReputation = 5
    const commentReputation = 3
    const airdrop = 30
    const unirepSocial = await UnirepSocialF.deploy(
        unirep.address,
        postReputation,
        commentReputation,
        airdrop,
        [
            {
                contractAddress: verifier.address,
                merkleTreeDepth: 32,
            },
        ]
    )
    await unirepSocial.deployed()
    console.log(`Unirep address: ${unirep.address}`)
    console.log(`Unirep social address: ${unirepSocial.address}`)
})()
