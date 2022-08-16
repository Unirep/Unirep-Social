import { useHistory, useLocation } from 'react-router-dom'

import BasicPage from '../basicPage/basicPage'
import PrivateKey from './privateKey'

const SettingPage = () => {
    const history = useHistory()
    const location = useLocation<Location>()
    const state = JSON.parse(JSON.stringify(location.state))
    const isConfirmed = state.isConfirmed

    return (
        <BasicPage>
            <div
                className="back"
                onClick={() => history.push('/user', { isConfirmed: true })}
            >
                <img src={require('../../../public/images/arrow-left.svg')} />
            </div>
            <PrivateKey />
        </BasicPage>
    )
}

export default SettingPage
