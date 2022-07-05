import { useContext } from 'react'
import { useHistory } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import UserContext from '../../context/User'

import DefaultWidget from './defaultWidget'
import UserInfoWidget from './userInfoWidget'
import ReminderWidget from './reminderWidget'
import PostsWidget from './postsWidget'
import { Page } from '../../constants'

const SideColumn = () => {
    const history = useHistory()
    const userContext = useContext(UserContext)

    const page = window.location.pathname as any

    const gotoSetting = () => {
        if (userContext.userState) {
            history.push('/setting', { isConfirmed: true })
        }
    }

    return (
        <div>
            {page === Page.Setting ? (
                <div className="margin-top widget"></div>
            ) : (
                <div></div>
            )}
            {page === Page.User ? (
                <div className="setting widget">
                    <img
                        src={require('../../../public/images/setting.svg')}
                        onClick={gotoSetting}
                    />
                </div>
            ) : (
                <div></div>
            )}
            {userContext.userState && page !== Page.Setting ? (
                <UserInfoWidget />
            ) : (
                <div></div>
            )}
            {userContext.userState &&
            (page === Page.New || page === Page.Post) ? (
                <ReminderWidget page={page} />
            ) : (
                <div></div>
            )}
            {userContext.userState && page === Page.User ? (
                <PostsWidget />
            ) : (
                <div></div>
            )}
            <DefaultWidget />
            <div className="back-to-top" onClick={() => window.scrollTo(0, 0)}>
                Back to top
            </div>
        </div>
    )
}

export default observer(SideColumn)
