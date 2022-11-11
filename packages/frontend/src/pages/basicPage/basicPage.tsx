import { useContext, useState, useEffect } from 'react'
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
}

const BasicPage = ({ children }: Props) => {
    const { isMenuOpen } = useContext(WebContext)
    const uiContext = useContext(UIContext)

    return (
        <div className="body-columns">
            <div className="margin-box"></div>
            <div className="content">
                <Banner />
                <div className="main-content">
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
