const { deployUnirep } = require('@unirep/contracts/deploy')
const UnirepSocial = require('../artifacts/contracts/UnirepSocial.sol/UnirepSocial.json')
const {
    GLOBAL_STATE_TREE_DEPTH,
    USER_STATE_TREE_DEPTH,
    EPOCH_TREE_DEPTH,
} = require('@unirep/circuits')
const NegativeRepVerifier = require('../artifacts/contracts/NegativeRepVerifier.sol/Verifier.json')
const SubsidyKeyVerifier = require('../artifacts/contracts/SubsidyKeyVerifier.sol/Verifier.json')

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
    console.log('Deploying NegativeRepVerifier')
    const NegativeRepVerifierF = new ethers.ContractFactory(
        NegativeRepVerifier.abi,
        NegativeRepVerifier.bytecode,
        signer
    )
    const negativeRepVerifier = await NegativeRepVerifierF.deploy()
    await negativeRepVerifier.deployed()
    console.log('Deploying SubsidyKeyVerifier')
    const SubsidyKeyVerifierF = new ethers.ContractFactory(
        SubsidyKeyVerifier.abi,
        SubsidyKeyVerifier.bytecode,
        signer
    )
    const subsidyKeyVerifier = await SubsidyKeyVerifierF.deploy()
    await subsidyKeyVerifier.deployed()
    console.log('Deploying UnirepSocial')
    const UnirepSocialF = new ethers.ContractFactory(
        UnirepSocial.abi,
        UnirepSocial.bytecode,
        signer
    )
    const postReputation = 5
    const commentReputation = 3
    const airdrop = 0
    const epkSubsidy = 10
    const unirepSocial = await UnirepSocialF.deploy(
        unirep.address,
        negativeRepVerifier.address,
        subsidyKeyVerifier.address,
        postReputation,
        commentReputation,
        airdrop,
        epkSubsidy
    )
    await unirepSocial.deployed()
    console.log(`Unirep address: ${unirep.address}`)
    console.log(`Unirep social address: ${unirepSocial.address}`)
})()
