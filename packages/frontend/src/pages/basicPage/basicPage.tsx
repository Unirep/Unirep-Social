import { useContext, useState, useEffect } from 'react'
import { useHistory } from 'react-router-dom'

import { WebContext } from '../../context/WebContext'
import UserContext from '../../context/User'
import QueueContext, { ActionType } from '../../context/Queue'
import EpochContext from '../../context/EpochManager'

import Banner from '../../layout/banner/banner'
import SideColumn from '../../layout/sideColumn/sideColumn'
import Overlay from '../../layout/overlay/overlay'
import ProgressBar from '../../layout/progressBar/progressBar'
import RefreshReminder from '../../components/refreshReminder'

type Props = {
    children: any
    hasBack?: boolean
    title?: string
}

const BasicPage = ({ hasBack, title, children }: Props) => {
    const { isMenuOpen } = useContext(WebContext)
    const history = useHistory()

    const back = () => {
        console.log('back')
        history.goBack()
    }

    const [isReminderOn, setReminderOn] = useState<boolean>(false)
    const userContext = useContext(UserContext)
    const queue = useContext(QueueContext)
    const epochManager = useContext(EpochContext)

    const closeReminder = () => {
        if (queue.queuedOp(ActionType.UST)) {
            setReminderOn(false)
        }
    }

    useEffect(() => {
        if (
            userContext.userState &&
            !userContext.isInitialSyncing &&
            (epochManager.readyToTransition || userContext.needsUST) &&
            !queue.queuedOp(ActionType.UST)
        ) {
            setReminderOn(true)
        }
    })

    return (
        <div className="body-columns">
            <div className="margin-box"></div>
            <div className="content">
                <Banner />
                <div className="main-content">
                    <div className="main-content-bar">
                        {hasBack && (
                            <img
                                src={require('../../../public/images/arrow-left.svg')}
                                onClick={back}
                            />
                        )}
                        {title && <p>{title}</p>}
                    </div>

                    {isReminderOn && (
                        <RefreshReminder closeReminder={closeReminder} />
                    )}
                    {children}
                </div>
                <div className="side-content">
                    <SideColumn />
                </div>
            </div>
            <div className="margin-box"></div>

            <ProgressBar />

            {isMenuOpen ? <Overlay /> : <div></div>}
        </div>
    )
}

export default BasicPage
