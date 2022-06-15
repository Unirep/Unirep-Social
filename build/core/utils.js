'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.UnirepSocialFactory =
    exports.UnirepFactory =
    exports.deployUnirepSocial =
        void 0
const socialMedia_1 = require('../config/socialMedia')
const Unirep__factory_1 = require('../typechain/factories/Unirep__factory')
Object.defineProperty(exports, 'UnirepFactory', {
    enumerable: true,
    get: function () {
        return Unirep__factory_1.Unirep__factory
    },
})
const UnirepSocial__factory_1 = require('../typechain/factories/UnirepSocial__factory')
Object.defineProperty(exports, 'UnirepSocialFactory', {
    enumerable: true,
    get: function () {
        return UnirepSocial__factory_1.UnirepSocial__factory
    },
})
const deployUnirepSocial = async (deployer, UnirepAddr, _settings) => {
    console.log('Deploying Unirep Social')
    const _defaultAirdroppedRep = socialMedia_1.defaultAirdroppedReputation
    const _postReputation = socialMedia_1.defaultPostReputation
    const _commentReputation = socialMedia_1.defaultCommentReputation
    const f = new UnirepSocial__factory_1.UnirepSocial__factory(deployer)
    const c = await f.deploy(
        UnirepAddr,
        _postReputation,
        _commentReputation,
        _defaultAirdroppedRep,
        {
            gasLimit: 9000000,
        }
    )
    await c.deployTransaction.wait()
    // Print out deployment info
    console.log(
        '-----------------------------------------------------------------'
    )
    console.log(
        'Bytecode size of Unirep Social:',
        Math.floor(Unirep__factory_1.Unirep__factory.bytecode.length / 2),
        'bytes'
    )
    let receipt = await c.provider.getTransactionReceipt(
        c.deployTransaction.hash
    )
    console.log(
        'Gas cost of deploying Unirep Social:',
        receipt.gasUsed.toString()
    )
    console.log(
        '-----------------------------------------------------------------'
    )
    return c
}
exports.deployUnirepSocial = deployUnirepSocial
