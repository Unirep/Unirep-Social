import { dbUri } from '../config/database';
import Unirep from "../artifacts/contracts/Unirep.sol/Unirep.json"
import UnirepSocial from "../artifacts/contracts/UnirepSocial.sol/UnirepSocial.json"
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import {
  validateEthAddress,
} from './utils'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { saveSettingsFromContract,
  updateDBFromNewGSTLeafInsertedEvent,
  updateDBFromAttestationEvent,
  updateDBFromPostSubmittedEvent,
  updateDBFromCommentSubmittedEvent,
  updateDBFromReputationNullifierSubmittedEvent,
  updateDBFromEpochEndedEvent,
  updateDBFromUserStateTransitionEvent,
  connectDB,
  initDB,}from '../database/utils'

const configureSubparser = (subparsers: any) => {
const parser = subparsers.add_parser(
      'eventListeners',
      { add_help: true },
  )

  parser.add_argument(
      '-e', '--eth-provider',
      {
          action: 'store',
          type: 'str',
          help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
      }
  )

  parser.add_argument(
      '-x', '--contract',
      {
          required: true,
          type: 'str',
          help: 'The Unirep Social contract address',
      }
  )
}

const eventListeners = async (args: any) => {

  // Unirep Social contract
  if (!validateEthAddress(args.contract)) {
    console.error('Error: invalid contract address')
    return
  }
  const unirepSocialAddress = args.contract

  // Ethereum provider
  const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER

  console.log('listener start')

  const db = await connectDB(dbUri)
  const isInit = await initDB(db)
  if(!isInit){
    console.error('Error: DB is not initialized')
    return
  }

  const provider = new hardhatEthers.providers.JsonRpcProvider(ethProvider)
  const unirepSocialContract = new ethers.Contract(
    unirepSocialAddress,
    UnirepSocial.abi,
    provider,
)

const unirepAddress = await unirepSocialContract.unirep()

const unirepContract = new ethers.Contract(
    unirepAddress,
    Unirep.abi,
    provider,
)

  await saveSettingsFromContract(unirepContract)

  const NewGSTLeafInsertedFilter = unirepContract.filters.NewGSTLeafInserted()
  const AttestationSubmittedFilter = unirepContract.filters.AttestationSubmitted()
  const reputationSubmittedFilter = unirepContract.filters.ReputationNullifierSubmitted()
  const epochEndedFilter = unirepContract.filters.EpochEnded()
  const userStateTransitionedFilter = unirepContract.filters.UserStateTransitioned()
  const postSubmittedFilter = unirepSocialContract.filters.PostSubmitted()
  const commentSubmittedFilter = unirepSocialContract.filters.CommentSubmitted()
  

  // NewGSTLeaf listeners
  provider.on(
    NewGSTLeafInsertedFilter, (event) => updateDBFromNewGSTLeafInsertedEvent(event)
  )

  // PostSubmitted listeners
  provider.on(
    postSubmittedFilter, (event) => updateDBFromPostSubmittedEvent(event)
  )

  // CommentSubmitted listeners
  provider.on(
    commentSubmittedFilter, (event) => updateDBFromCommentSubmittedEvent(event)
  )

  // ReputationSubmitted listeners
  provider.on(
    reputationSubmittedFilter, (event) => updateDBFromReputationNullifierSubmittedEvent(event)
  )

  // Attestation listeners
  provider.on(
    AttestationSubmittedFilter, (event) => updateDBFromAttestationEvent(event)
  )

  // Epoch Ended filter listeners
  provider.on(
    epochEndedFilter, (event) => updateDBFromEpochEndedEvent(event, unirepContract)
  )

  // User state transition listeners
  provider.on(
    userStateTransitionedFilter, (event) => updateDBFromUserStateTransitionEvent(event)
  )
}

export {
  eventListeners,
  configureSubparser,
}