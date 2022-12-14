import { useContext, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import { ABOUT_URL } from '../../config'

import { WebContext } from '../../context/WebContext'
import UserContext from '../../context/User'
import UIContext from '../../context/UI'
import PostContext from '../../context/Post'

const Overlay = () => {
    const { setIsMenuOpen } = useContext(WebContext)
    const history = useHistory()
    const userContext = useContext(UserContext)
    const uiContext = useContext(UIContext)
    const postContext = useContext(PostContext)

    const [checkNotDownload, setCheckNotDownload] = useState<boolean>(false)

    const closeOverlay = () => {
        console.log('close over lay')
        setIsMenuOpen(false)
    }

    const preventPropagation = (event: any) => {
        event.stopPropagation()
    }

    const gotoUserPage = () => {
        history.push(`/user`, { isConfirmed: true })
    }

    const gotoSettingPage = () => {
        history.push(`/setting`, { isConfirmed: true })
    }

    const signout = async (event: any) => {
        if (!uiContext.hasDownloadPrivateKey && !checkNotDownload) {
            preventPropagation(event)
            return
        }

        await userContext.logout()
        uiContext.uiLogout()
        postContext.logout()
        history.push('/')
        window.location.reload()
    }

    const onChangeCheckbox = (event: any) => {
        if (event.target.checked) {
            setCheckNotDownload(true)
        } else {
            setCheckNotDownload(false)
        }
    }

    return (
        <div className="overlay" onClick={closeOverlay}>
            <div className="blur-area"></div>
            <div className="black-area">
                <img
                    src={require('../../../public/images/close.svg')}
                    className="close-info"
                />
                <div className="fixed-info">
                    <a href={`${ABOUT_URL}/how-it-works`}>How it work</a>
                    <a href={`${ABOUT_URL}/how-it-works#faq`}>FAQ</a>
                    <a href={ABOUT_URL}>About</a>
                </div>
                {userContext.userState ? (
                    <div className="dynamic-info">
                        <a href="/feedback">Send feedback</a>
                        <p onClick={gotoUserPage}>My stuff</p>
                        <p onClick={gotoSettingPage}>Settings</p>
                        {!uiContext.hasDownloadPrivateKey && (
                            <div
                                className="warning"
                                onClick={preventPropagation}
                            >
                                <p>
                                    Please grab your private key from the
                                    setting page, otherwise you can’t sign back
                                    in :o
                                </p>
                                <label className="check-not-download">
                                    I don’t care, let me out anyway
                                    <input
                                        type="checkbox"
                                        onChange={onChangeCheckbox}
                                    />
                                    <span className="style-check-box"></span>
                                </label>
                            </div>
                        )}
                        <p
                            onClick={signout}
                            className={
                                !uiContext.hasDownloadPrivateKey &&
                                !checkNotDownload
                                    ? 'disabled'
                                    : ''
                            }
                        >
                            Sign out
                        </p>
                    </div>
                ) : (
                    <div className="dynamic-info">
                        <a href="/feedback">Send feedback</a>
                        <a href="/start">Get started</a>
                    </div>
                )}
            </div>
        </div>
    )
}

export default observer(Overlay)
