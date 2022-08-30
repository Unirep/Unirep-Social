const { deployUnirep } = require('@unirep/contracts/deploy')
const { deployUnirepSocial } = require('../src/utils')
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
    const postReputation = 5
    const commentReputation = 3
    const airdropReputation = 0
    const unirepSocial = await deployUnirepSocial(signer, unirep.address, {
        postReputation,
        commentReputation,
        airdropReputation,
    })
    await unirepSocial.deployed()
    console.log(`Unirep address: ${unirep.address}`)
    console.log(`Unirep social address: ${unirepSocial.address}`)
})()
