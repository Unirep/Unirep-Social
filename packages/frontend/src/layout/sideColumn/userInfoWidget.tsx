import { useContext, useEffect, useState } from 'react'
import dateformat from 'dateformat'
import { observer } from 'mobx-react-lite'

import UserContext from '../../context/User'
import PostContext from '../../context/Post'
import EpochContext from '../../context/EpochManager'
import QueueContext, { ActionType, Metadata } from '../../context/Queue'

import HelpWidget from '../../components/helpWidget'
import { InfoType } from '../../constants'
import { shortenEpochKey } from '../../utils'

const UserInfoWidget = () => {
    const epochManager = useContext(EpochContext)
    const userContext = useContext(UserContext)
    const postContext = useContext(PostContext)
    const queue = useContext(QueueContext)
    const [countdownText, setCountdownText] = useState<string>('')
    const [diffTime, setDiffTime] = useState<number>(0)
    const nextUSTTimeString = dateformat(
        new Date(epochManager.nextTransition),
        'mmm/dd, hh:MM TT'
    )

    const makeCountdownText = () => {
        const diff = (epochManager.nextTransition - Date.now()) / 1000
        setDiffTime(diff)

        if (userContext.isInitialSyncing) {
            return 'Syncing...'
        }

        if (
            userContext.userState &&
            (epochManager.readyToTransition || userContext.needsUST)
        ) {
            return 'Doing UST...'
        }
        const days = Math.floor(diff / (24 * 60 * 60))
        if (days > 0) {
            return days + ' days'
        }
        const hours = Math.floor(diff / (60 * 60))
        if (hours > 0) {
            return hours + ' hours'
        }
        const minutes = Math.floor(diff / 60)
        if (minutes > 0) {
            return minutes + ' minutes'
        }
        if (diff >= 0) {
            return Math.floor(diff) + ' seconds'
        }
        return 'Awaiting Epoch Change...'
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            setCountdownText(makeCountdownText())
        }, 1000)

        return () => clearTimeout(timer)
    }, [diffTime])

    return (
        <div>
            {userContext.userState && userContext.id ? (
                <div className="user-info-widget widget">
                    <div className="rep-info">
                        <h4>My Rep</h4>
                        <h3>
                            <img
                                src={require('../../../public/images/lighting.svg')}
                            />
                            {userContext.netReputation}
                        </h3>
                    </div>
                    {userContext.userState &&
                    !userContext.isInitialSyncing &&
                    (epochManager.readyToTransition || userContext.needsUST) &&
                    !queue.queuedOp(ActionType.UST) ? (
                        <div className="ust-info">
                            <h4>
                                Previous cycle was ended at {nextUSTTimeString}
                            </h4>
                            <div className="margin"></div>
                            <h4>A new cycle is required.</h4>
                            <div className="margin"></div>
                            <button
                                onClick={() => {
                                    queue.addOp(
                                        async (updateStatus) => {
                                            updateStatus({
                                                title: 'Performing UST',
                                                details:
                                                    'Generating ZK proof...',
                                            })
                                            const { transaction } =
                                                await userContext.userStateTransition()
                                            updateStatus({
                                                title: 'Performing UST',
                                                details:
                                                    'Waiting for transaction...',
                                            })
                                            await queue.afterTx(transaction)
                                            await userContext.calculateAllEpks()
                                            await userContext.loadReputation()
                                            await epochManager.updateWatch()
                                            await userContext.updateLatestTransitionedEpoch()

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
                    ) : (
                        <div className="ust-info">
                            <div className="info-row">
                                <h4>
                                    Rep-Handout
                                    <HelpWidget type={InfoType.repHandout} />
                                </h4>
                                <div className="rep-handout">
                                    <strong>
                                        {userContext.subsidyReputation}
                                    </strong>
                                    <div className="interline"></div>
                                    {userContext.currentEpochKeys[0]}
                                </div>
                            </div>

                            <div className="info-row">
                                <h4>
                                    Personas
                                    <HelpWidget type={InfoType.persona} />
                                </h4>
                                <div className="epks">
                                    {userContext.currentEpochKeys.map((key) => (
                                        <div className="epk" key={key}>
                                            {shortenEpochKey(key)}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="info-row">
                                <h4>
                                    Transition at:
                                    <HelpWidget type={InfoType.countdown} />
                                </h4>
                                <div className="countdown">
                                    {diffTime < 60
                                        ? countdownText
                                        : nextUSTTimeString}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    )
}

export default observer(UserInfoWidget)
