const { deployUnirep } = require('@unirep/contracts/deploy')
const { deployUnirepSocial } = require('../deploy')

;(async () => {
    const [signer] = await ethers.getSigners()
    const unirep = await deployUnirep(signer)
    const unirepSocial = await deployUnirepSocial(signer, unirep.address)
    await unirepSocial.deployed()
    console.log(`Unirep address: ${unirep.address}`)
    console.log(`Unirep social address: ${unirepSocial.address}`)
    console.log(
        `timestamp`,
        await unirep.attesterStartTimestamp(unirepSocial.address)
    )
    console.log(
        `epoch length`,
        await unirep.attesterEpochLength(unirepSocial.address)
    )
})()
