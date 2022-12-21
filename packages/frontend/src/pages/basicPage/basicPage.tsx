import { useContext } from 'react'
import { useHistory } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import { WebContext } from '../../context/WebContext'
import UIContext, { EpochStatus } from '../../context/UI'

import Banner from '../../layout/banner/banner'
import SideColumn from '../../layout/sideColumn/sideColumn'
import Overlay from '../../layout/overlay/overlay'
import ProgressBar from '../../layout/progressBar/progressBar'
import RefreshReminder from '../../components/refreshReminder'

type Props = {
    children: any
    hasBack?: boolean
    title?: string
    topic?: string
}

const BasicPage = ({ hasBack, title, children, topic }: Props) => {
    const { isMenuOpen } = useContext(WebContext)
    const history = useHistory()

    const back = () => {
        console.log('back')
        history.goBack()
    }

    const uiContext = useContext(UIContext)

    return (
        <div className="body-columns">
            <div className="margin-box"></div>
            <div className="content">
                <Banner />
                <div className="main-content">
                    {topic !== undefined && (
                        <h2 className="topic-landing">
                            <i>{topic}</i>
                        </h2>
                    )}
                    <div className="main-content-bar">
                        {hasBack && (
                            <img
                                src={require('../../../public/images/arrow-left.svg')}
                                onClick={back}
                            />
                        )}
                        {title && <p>{title}</p>}
                    </div>
                    {uiContext.epochStatus === EpochStatus.needsUST && (
                        <RefreshReminder />
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

export default observer(BasicPage)
