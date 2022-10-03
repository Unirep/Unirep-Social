import { useContext } from 'react'
import { useHistory } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import UserContext from '../../context/User'
import UIContext from '../../context/UI'

import DefaultWidget from './defaultWidget'
import UserInfoWidget from './userInfoWidget'
import ReminderWidget from './reminderWidget'
import PostsWidget from './postsWidget'
import { Page } from '../../constants'
import PrivateKeyDetail from './privateKeyDetail'

const SideColumn = () => {
    const history = useHistory()
    const userContext = useContext(UserContext)
    const uiContext = useContext(UIContext)
    const page = window.location.pathname as any

    const gotoSetting = () => {
        if (userContext.userState) {
            history.push('/setting', { isConfirmed: true })
        }
    }

    return (
        <div>
            {page === Page.User && <div style={{ height: '52px' }}></div>}
            {page === Page.Setting && <div style={{ height: '72px' }}></div>}
            {page === Page.Setting && <PrivateKeyDetail />}
            {userContext.userState && page !== Page.Setting && (
                <UserInfoWidget />
            )}
            {userContext.userState &&
                (page === Page.New || page === Page.Post) && (
                    <ReminderWidget page={page} />
                )}
            {userContext.userState && page === Page.User && <PostsWidget />}
            <DefaultWidget />
            {uiContext.scrollTop > 104 + window.innerHeight / 2 && (
                <div
                    className="back-to-top"
                    onClick={() => window.scrollTo(0, 0)}
                >
                    Back to top
                </div>
            )}
        </div>
    )
}

export default observer(SideColumn)
