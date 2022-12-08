import { useContext } from 'react'

import UserContext from '../context/User'
import QueueContext, { Metadata, ActionType } from '../context/Queue'
import EpochContetxt from '../context/EpochManager'

const RefreshReminder = () => {
    const userContext = useContext(UserContext)
    const queue = useContext(QueueContext)
    const epochManager = useContext(EpochContetxt)

    return (
        <div className="reminder-block">
            A new cycle is required in order to make a new post.
            <button
                className="refresh-button"
                onClick={() => {
                    queue.addOp(
                        async (updateStatus) => {
                            updateStatus({
                                title: 'Performing UST',
                                details: 'Generating ZK proof...',
                            })
                            const { transaction } =
                                await userContext.userStateTransition()
                            updateStatus({
                                title: 'Performing UST',
                                details: 'Waiting for transaction...',
                            })
                            await queue.afterTx(transaction)
                            await epochManager.updateWatch()
                            await userContext.loadCurrentEpoch()
                            await userContext.updateLatestTransitionedEpoch()
                            await userContext.calculateAllEpks()
                            await userContext.loadReputation()

                            if (userContext.reputation < 0) {
                                queue.addOp(
                                    async (updateStatus) => {
                                        updateStatus({
                                            title: 'Performing Airdrop',
                                            details: 'generating ZK proof...',
                                        })
                                        const { transaction, error } =
                                            await userContext.getAirdrop()
                                        updateStatus({
                                            title: 'Performing Airdrop',
                                            details:
                                                'Waiting for transaction...',
                                        })
                                        await queue.afterTx(transaction)
                                        await epochManager.updateWatch()

                                        let metadata: Metadata = {
                                            transactionId: transaction,
                                        }
                                        return metadata
                                    },
                                    {
                                        type: ActionType.Airdrop,
                                    }
                                )
                            }

                            let metadata: Metadata = {
                                transactionId: transaction,
                            }
                            return metadata
                        },
                        {
                            type: ActionType.UST,
                        }
                    )
                }}
            >
                Refresh
            </button>
        </div>
    )
}

export default RefreshReminder
