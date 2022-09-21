import { useState } from 'react'
import { useLocation } from 'react-router-dom'

import BasicPage from '../basicPage/basicPage'
import PrivateKey from './privateKey'

enum SettingNav {
    PrivateKey,
    Username,
}

const SettingPage = () => {
    const location = useLocation<Location>()
    const state = JSON.parse(JSON.stringify(location.state))
    const isConfirmed = state.isConfirmed

    const [nav, setNav] = useState<SettingNav>(SettingNav.PrivateKey)

    return (
        <BasicPage>
            <h3>Settings</h3>
            <div className="setting-nav-bar">
                <div
                    className={
                        nav === SettingNav.PrivateKey
                            ? 'setting-nav chosen'
                            : 'setting-nav'
                    }
                    onClick={() => setNav(SettingNav.PrivateKey)}
                >
                    Private Key
                </div>
                <div className="interline"></div>
                <div
                    className={
                        nav === SettingNav.Username
                            ? 'setting-nav chosen'
                            : 'setting-nav'
                    }
                    onClick={() => setNav(SettingNav.Username)}
                >
                    User Name
                </div>
            </div>
        </BasicPage>
    )
}

export default SettingPage
