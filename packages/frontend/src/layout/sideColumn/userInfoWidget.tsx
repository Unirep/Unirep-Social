import { useContext, useEffect, useState } from 'react'
import dateformat from 'dateformat'
import { observer } from 'mobx-react-lite'

import UserContext from '../../context/User'
import PostContext from '../../context/Post'
import EpochContext from '../../context/EpochManager'
import QueueContext, { ActionType, Metadata } from '../../context/Queue'

import HelpWidget from '../../components/helpWidget/helpWidget'
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
        'dd/mm/yyyy hh:MM TT'
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
            {userContext.userState ? (
                <div className="user-info-widget widget">
                    <div className="rep-info">
                        <p>My Rep</p>
                        <h3>
                            <img
                                src={require('../../../public/images/lighting.svg')}
                            />
                            {userContext.netReputation}
                        </h3>
                    </div>
                    <div className="ust-info">
                        <div className="block-title">
                            In this cycle, my personas are{' '}
                            <HelpWidget type={InfoType.persona} />
                        </div>
                        <div className="epks">
                            {userContext.currentEpochKeys.map((key) => (
                                <div className="epk" key={key}>
                                    {shortenEpochKey(key)}
                                </div>
                            ))}
                        </div>
                        <div className="margin"></div>
                        <div className="block-title">
                            Remaining time:{' '}
                            <HelpWidget type={InfoType.countdown} />
                        </div>
                        <div className="countdown">{countdownText}</div>
                        <div className="margin"></div>
                        <div className="block-title">Transition at:</div>
                        <div className="countdown small">
                            {nextUSTTimeString}
                        </div>
                    </div>
                </div>
            ) : (
                <div></div>
            )}
            {userContext.userState &&
                !userContext.isInitialSyncing &&
                (epochManager.readyToTransition || userContext.needsUST) &&
                !queue.queuedOp(ActionType.UST) && (
                    <div className="custom-ui">
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                maxWidth: '400px',
                                alignSelf: 'center',
                            }}
                        >
                            <p>User State Transition</p>
                            <h2>It’s time to move on to the new cycle!</h2>
                            <button
                                className="custom-btn"
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

                                            let metadata: Metadata = {
                                                transactionId: transaction,
                                            }
                                            return metadata
                                        },
                                        {
                                            type: ActionType.UST,
                                        }
                                    )
                                    postContext.getAirdrop()
                                }}
                            >
                                Let's go
                            </button>
                        </div>
                    </div>
                )}
        </div>
    )
}

export default observer(UserInfoWidget)
