import { useContext } from 'react'
import { useHistory } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import { ABOUT_URL } from '../../config'

import { WebContext } from '../../context/WebContext'
import UserContext from '../../context/User'
import QueueContext from '../../context/Queue'

const Overlay = () => {
    const { setIsMenuOpen } = useContext(WebContext)
    const history = useHistory()
    const userContext = useContext(UserContext)
    const queue = useContext(QueueContext)

    const closeOverlay = () => {
        console.log('close over lay')
        setIsMenuOpen(false)
    }

    const gotoUserPage = () => {
        history.push(`/user`, { isConfirmed: true })
    }

    const signout = async () => {
        if (!queue.isLoading) {
            await userContext.logout()
            setIsMenuOpen(false)
            history.push('/')
        }
    }

    return (
        <div className="overlay" onClick={closeOverlay}>
            <div className="blur-area"></div>
            <div className="black-area">
                <div className="close-info">
                    <img src={require('../../../public/images/close.svg')} />
                </div>
                <div className="fixed-info">
                    <a href={`${ABOUT_URL}/how-it-works`}>How it work</a>
                    <a href={`${ABOUT_URL}/how-it-works#faq`}>FAQ</a>
                    <a href={ABOUT_URL}>About</a>
                </div>
                {userContext.userState ? (
                    <div className="dynamic-info">
                        <a href="/feedback">Send feedback</a>
                        <p onClick={gotoUserPage}>My stuff</p>
                        <p onClick={signout}>Sign out</p>
                    </div>
                ) : (
                    <div className="dynamic-info">
                        <a href="/feedback">Send feedback</a>
                        <a href="/login">Sign in</a>
                        <a href="/signup">Join</a>
                    </div>
                )}
            </div>
        </div>
    )
}

export default observer(Overlay)
