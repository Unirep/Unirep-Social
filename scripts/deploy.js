const { deployUnirep } = require('@unirep/contracts')
const UnirepSocial = require('../artifacts/contracts/UnirepSocial.sol/UnirepSocial.json')

;(async () => {
  const [signer] = await ethers.getSigners()
  const unirep = await deployUnirep(signer, {
    globalStateTreeDepth: 5,
    userStateTreeDepth: 5,
    epochTreeDepth: 32,
  })
  const UnirepSocialF = new ethers.ContractFactory(UnirepSocial.abi, UnirepSocial.bytecode, signer)
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
