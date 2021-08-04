import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import mongoose from 'mongoose'
import chai from "chai"
import { attestingFee, epochLength, circuitEpochTreeDepth, circuitGlobalStateTreeDepth, numEpochKeyNoncePerEpoch, maxUsers, circuitNullifierTreeDepth, numAttestationsPerEpochKey, circuitUserStateTreeDepth} from '../../config/testLocal'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { IncrementalQuinTree } from 'maci-crypto'
import { deployUnirep, genNewUserStateTree, getTreeDepthsForTesting } from '../utils'
import { deployUnirepSocial } from '../../core/utils'

const { expect } = chai

import Unirep from "../../artifacts/contracts/Unirep.sol/Unirep.json"
import { DEFAULT_AIRDROPPED_KARMA, DEFAULT_COMMENT_KARMA, DEFAULT_POST_KARMA } from '../../config/socialMedia'
import { UnirepState } from '../../database/UnirepState'
import { connectDB, genGSTreeFromDB, initDB, saveSettingsFromContract, updateDBFromEpochEndedEvent, updateDBFromNewGSTLeafInsertedEvent } from '../../database/utils'
import { dbTestUri, dbUri } from '../../config/database'
import GSTLeaves, { IGSTLeaves } from '../../database/models/GSTLeaf'
import { add0x } from '../../crypto/SMT'
import UserSignUp, { IUserSignUp } from '../../database/models/userSignUp'
import Settings, { ISettings } from '../../database/models/settings'


describe('User Sign Up', function () {
    this.timeout(300000)
    let unirepState

    before(async () => {
        unirepState = new UnirepState(dbTestUri)
        await unirepState.connectDB()
        await unirepState.initDB()
    })

    after(async() => {
        unirepState.disconnectDB()
    })

    it('Generate GSTree from DB', async () => {
        const GSTree = await unirepState.genGSTree(1)
    })

})