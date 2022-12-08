import { useContext, useEffect, useState } from 'react'
import { useHistory } from 'react-router-dom'
import dateformat from 'dateformat'
import { observer } from 'mobx-react-lite'

import UserContext from '../../context/User'
import EpochContext from '../../context/EpochManager'
import QueueContext, { ActionType, Metadata } from '../../context/Queue'
import UIContext, { EpochStatus } from '../../context/UI'

import HelpWidget from '../../components/helpWidget'
import MyButton, { MyButtonType } from '../../components/myButton'
import CustomGap from '../../components/customGap'
import { InfoType } from '../../constants'
import { shortenEpochKey } from '../../utils'

const UserInfoWidget = () => {
    const epochManager = useContext(EpochContext)
    const userContext = useContext(UserContext)
    const uiContext = useContext(UIContext)
    const queue = useContext(QueueContext)
    const history = useHistory()

    const [countdownText, setCountdownText] = useState<string>('')
    const [diffTime, setDiffTime] = useState<number>(0)
    const nextUSTTimeString = dateformat(
        new Date(epochManager.nextTransition),
        'mmm/dd, hh:MM TT'
    )

    const makeCountdownText = () => {
        const diff = (epochManager.nextTransition - Date.now()) / 1000
        setDiffTime(diff)

        if (uiContext.epochStatus === EpochStatus.syncing) {
            return 'Syncing...'
        } else if (uiContext.epochStatus === EpochStatus.doingUST) {
            return 'Doing UST...'
        } else if (uiContext.epochStatus === EpochStatus.needsUST) {
            return 'Needs UST'
        } else {
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
    }

    const gotoSettingPage = () => {
        history.push(`/setting`, { isConfirmed: true })
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
                        {!uiContext.hasDownloadPrivateKey && (
                            <div>
                                <CustomGap times={1} />
                                <MyButton
                                    type={MyButtonType.dark}
                                    onClick={gotoSettingPage}
                                    fullSize={true}
                                >
                                    Grab my private key
                                    <img
                                        src={require('../../../public/images/arrow-right.svg')}
                                    />
                                </MyButton>
                            </div>
                        )}
                    </div>
                    {uiContext.epochStatus === EpochStatus.needsUST ? (
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
                                                            details:
                                                                'generating ZK proof...',
                                                        })
                                                        const {
                                                            transaction,
                                                            error,
                                                        } = await userContext.getAirdrop()
                                                        updateStatus({
                                                            title: 'Performing Airdrop',
                                                            details:
                                                                'Waiting for transaction...',
                                                        })
                                                        await queue.afterTx(
                                                            transaction
                                                        )
                                                        await epochManager.updateWatch()

                                                        let metadata: Metadata =
                                                            {
                                                                transactionId:
                                                                    transaction,
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
