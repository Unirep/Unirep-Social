import { useEffect, useState, useContext } from 'react'
import { observer } from 'mobx-react-lite'

import UserContext from '../../context/User'
import UIContext from '../../context/UI'

import { ABOUT_URL } from '../../config'

const Banner = () => {
    const userContext = useContext(UserContext)
    const uiContext = useContext(UIContext)

    const [on, setOn] = useState<boolean>(false)

    useEffect(() => {
        if (window.location.pathname === '/') {
            setOn(true)
        }
    }, [])

    const closeBanner = () => {
        setOn(false)
        uiContext.setHasBanner(false)
    }

    return (
        <div className="banner-row">
            {uiContext.hasBanner && on && (
                <div className="banner">
                    <img src={require('../../../public/images/banner.svg')} />
                    <div className="banner-title">
                        Community built on ideas, not identities.
                    </div>
                    <div className="banner-content">
                        Stay up to date & share everything with everyone.
                    </div>
                    <div className="banner-buttons">
                        <a
                            className="banner-button"
                            href={ABOUT_URL + '/how-it-works'}
                        >
                            How it works
                        </a>
                        {!userContext.userState && (
                            <a className="banner-button" href="/start">
                                Join us
                            </a>
                        )}
                    </div>
                    <div className="banner-close" onClick={closeBanner}>
                        <img
                            src={require('../../../public/images/close.svg')}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

export default observer(Banner)
