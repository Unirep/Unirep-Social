const { deployUnirep } = require('@unirep/contracts')
const UnirepSocial = require('../artifacts/contracts/UnirepSocial.sol/UnirepSocial.json')
const {
    circuitGlobalStateTreeDepth,
    circuitUserStateTreeDepth,
    circuitEpochTreeDepth,
} = require('@unirep/circuits/config')

const attestingFee = ethers.utils.parseEther('0.000000000001')
const numEpochKeyNoncePerEpoch = 3
const numAttestationsPerProof = 5
const epochLength = 15 * 60 // seconds
const globalStateTreeDepth = circuitGlobalStateTreeDepth
const userStateTreeDepth = circuitUserStateTreeDepth
const epochTreeDepth = circuitEpochTreeDepth
const maxReputationBudget = 10
const maxUsers = 2 ** circuitGlobalStateTreeDepth - 1
const maxAttesters = 2 ** circuitUserStateTreeDepth - 1

;(async () => {
    const [signer] = await ethers.getSigners()
    const unirep = await deployUnirep(signer, {
        attestingFee,
        numEpochKeyNoncePerEpoch,
        numAttestationsPerProof,
        epochLength,
        globalStateTreeDepth,
        userStateTreeDepth,
        epochTreeDepth,
        maxReputationBudget,
        maxUsers,
        maxAttesters,
    })
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
        airdrop
    )
    await unirepSocial.deployed()
    console.log(`Unirep address: ${unirep.address}`)
    console.log(`Unirep social address: ${unirepSocial.address}`)
})()
