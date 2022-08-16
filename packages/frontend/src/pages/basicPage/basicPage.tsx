import { useContext } from 'react'

import { WebContext } from '../../context/WebContext'

import Banner from '../../layout/banner/banner'
import SideColumn from '../../layout/sideColumn/sideColumn'
import Overlay from '../../layout/overlay/overlay'
import ProgressBar from '../../layout/progressBar/progressBar'

type Props = {
    children: any
}

const BasicPage = ({ children }: Props) => {
    const { isMenuOpen } = useContext(WebContext)

    return (
        <div className="body-columns">
            <div className="margin-box"></div>
            <div className="content">
                <Banner />
                <div className="main-content">{children}</div>
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
