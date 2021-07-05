import { dbUri } from '../config/database';
import Unirep from "../artifacts/contracts/Unirep.sol/Unirep.json"
import UnirepSocial from "../artifacts/contracts/UnirepSocial.sol/UnirepSocial.json"
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import {
  validateEthAddress,
} from './utils'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'
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
import assert from 'assert';

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

  parser.add_argument(
    '-b', '--start-block',
    {
        action: 'store',
        type: 'int',
        help: 'The block the Unirep contract is deployed. Default: 0',
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
  const startBlock = (args.start_block) ? args.start_block : DEFAULT_START_BLOCK
  const currentBlock = await provider.getBlockNumber()
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
  const sequencerFilter = unirepContract.filters.Sequencer()
  const postSubmittedFilter = unirepSocialContract.filters.PostSubmitted()
  const commentSubmittedFilter = unirepSocialContract.filters.CommentSubmitted()
  
  // Restore old data while restart database
  const newGSTLeafInsertedEvents =  await unirepContract.queryFilter(NewGSTLeafInsertedFilter, startBlock, currentBlock)
  const attestationSubmittedEvents =  await unirepContract.queryFilter(AttestationSubmittedFilter, startBlock, currentBlock)
  const reputationNullifierEvents =  await unirepContract.queryFilter(reputationSubmittedFilter, startBlock, currentBlock)
  const epochEndedEvents =  await unirepContract.queryFilter(epochEndedFilter, startBlock, currentBlock)
  const userStateTransitionedEvents =  await unirepContract.queryFilter(userStateTransitionedFilter, startBlock, currentBlock)
  const sequencerEvents =  await unirepContract.queryFilter(sequencerFilter, startBlock, currentBlock)

  for (let i = 0; i < sequencerEvents.length; i++) {

    const sequencerEvent = sequencerEvents[i]
    const occurredEvent = sequencerEvent.args?._event

    if (occurredEvent === "UserSignUp") {

      const newLeafEvent = newGSTLeafInsertedEvents.pop()
      assert(newLeafEvent !== undefined, `Event sequence mismatch: missing newGSTLeafInsertedEvent`)

      await updateDBFromNewGSTLeafInsertedEvent(newLeafEvent, startBlock)

    } else if (occurredEvent === "AttestationSubmitted") {

      const attestationEvent = attestationSubmittedEvents.pop()
      assert(attestationEvent !== undefined, `Event sequence mismatch: missing attestationSubmittedEvent`)

      await updateDBFromAttestationEvent(attestationEvent, startBlock)

    } else if (occurredEvent === "ReputationNullifierSubmitted") {

      const reputationEvent = reputationNullifierEvents.pop()
      assert(reputationEvent !== undefined, `Event sequence mismatch: missing ReputationNullifierSubmittedEvent`)

      await updateDBFromReputationNullifierSubmittedEvent(reputationEvent, startBlock)

    } else if (occurredEvent === "EpochEnded") {

      const epochEndedEvent = epochEndedEvents.pop()
      assert(epochEndedEvent !== undefined, `Event sequence mismatch: missing epochEndedEvent`)

      await updateDBFromEpochEndedEvent(epochEndedEvent, unirepContract, startBlock)

    } else if (occurredEvent === "UserStateTransitioned") {

      const userStateTransitionedEvent = userStateTransitionedEvents.pop()
      assert(userStateTransitionedEvent !== undefined, `Event sequence mismatch: missing userStateTransitionedEvent`)

      await updateDBFromUserStateTransitionEvent(userStateTransitionedEvent, startBlock)
    } else {

      throw new Error(`Unexpected event: ${occurredEvent}`)

    }
  }
  assert(newGSTLeafInsertedEvents.length == 0, `${newGSTLeafInsertedEvents.length} newGSTLeafInsert events left unprocessed`)
  assert(attestationSubmittedEvents.length == 0, `${attestationSubmittedEvents.length} attestationSubmitted events left unprocessed`)
  assert(epochEndedEvents.length == 0, `${epochEndedEvents.length} newGSTLeafInsert events left unprocessed`)
  assert(userStateTransitionedEvents.length == 0, `${userStateTransitionedEvents.length} newGSTLeafInsert events left unprocessed`)

  const postSubmittedEvents =  await unirepSocialContract.queryFilter(postSubmittedFilter)
  const commentSubmittedEvents =  await unirepSocialContract.queryFilter(commentSubmittedFilter)
  for (let i = 0; i < postSubmittedEvents.length; i++) {
    await updateDBFromPostSubmittedEvent(postSubmittedEvents[i], startBlock)
  }
  for (let i = 0; i < commentSubmittedEvents.length; i++) {
    await updateDBFromCommentSubmittedEvent(commentSubmittedEvents[i], startBlock)
  }

  // Start listening for new events
  // NewGSTLeaf listeners
  provider.on(
    NewGSTLeafInsertedFilter, (event) => updateDBFromNewGSTLeafInsertedEvent(event, currentBlock)
  )

  // PostSubmitted listeners
  provider.on(
    postSubmittedFilter, (event) => updateDBFromPostSubmittedEvent(event, currentBlock)
  )

  // CommentSubmitted listeners
  provider.on(
    commentSubmittedFilter, (event) => updateDBFromCommentSubmittedEvent(event, currentBlock)
  )

  // ReputationSubmitted listeners
  provider.on(
    reputationSubmittedFilter, (event) => updateDBFromReputationNullifierSubmittedEvent(event, currentBlock)
  )

  // Attestation listeners
  provider.on(
    AttestationSubmittedFilter, (event) => updateDBFromAttestationEvent(event, currentBlock)
  )

  // Epoch Ended filter listeners
  provider.on(
    epochEndedFilter, (event) => updateDBFromEpochEndedEvent(event, unirepContract, currentBlock)
  )

  // User state transition listeners
  provider.on(
    userStateTransitionedFilter, (event) => updateDBFromUserStateTransitionEvent(event, currentBlock)
  )
}

export {
  eventListeners,
  configureSubparser,
}