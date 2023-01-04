import { useContext, useEffect, useState } from 'react'
import { NavLink, useHistory, useLocation } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import { WebContext } from '../../context/WebContext'
import UnirepContext from '../../context/Unirep'
import UserContext from '../../context/User'

const Header = () => {
    const history = useHistory()
    const location = useLocation()
    const { isMenuOpen, setIsMenuOpen } = useContext(WebContext)
    const [searchInput, setSearchInput] = useState<string>('')
    const unirepConfig = useContext(UnirepContext)
    const userContext = useContext(UserContext)

    const [topic, setTopic] = useState('')

    useEffect(() => {
        const pathname = location.pathname
        const topic = pathname.split('/')[1]
        setTopic(topic)
    }, [location])

    const gotoUserPage = () => {
        history.push(`/user`, { isConfirmed: true })
    }

    const gotoSettingPage = () => {
        history.push(`/setting`, { isConfirmed: true })
    }

    const openMenu = () => {
        if (!isMenuOpen) {
            console.log('open menu!')
            setIsMenuOpen(true)
        }
    }

    const handleSearchInput = (event: any) => {
        console.log('search input : ' + event.target.value)
    }

    return (
        <header>
            <div className="navLinks">
                <NavLink to="/" className="link" activeClassName="active" exact>
                    <img
                        src={require('../../../public/images/unirep-title.svg')}
                    />
                </NavLink>
            </div>
            {/* <div className="search-bar">
                <div className="search-icon"><FaSearch /></div>
                <form>
                    <input type="text" name="searchInput" placeholder="Search by keyword, user names or epoch key" onChange={handleSearchInput} />
                </form>
            </div> */}
            {userContext.userState ? (
                <div className="navButtons">
                    <div id="rep" onClick={gotoUserPage}>
                        <img
                            src={require('../../../public/images/lighting.svg')}
                        />
                        {userContext.netReputation}
                    </div>
                    <div
                        id="user"
                        className={
                            location.pathname === '/user'
                                ? 'navBtn chosen'
                                : 'navBtn'
                        }
                    >
                        <img
                            src={require('../../../public/images/user.svg')}
                            onClick={gotoUserPage}
                        />
                    </div>
                    <div
                        id="setting"
                        className={
                            location.pathname === '/setting'
                                ? 'navBtn chosen'
                                : 'navBtn'
                        }
                    >
                        <img
                            src={require('../../../public/images/setting.svg')}
                            onClick={gotoSettingPage}
                        />
                    </div>
                    <div id="menu" className="navBtn">
                        <img
                            src={require('../../../public/images/menu.svg')}
                            onClick={openMenu}
                        />
                    </div>
                </div>
            ) : (
                <div className="navButtons">
                    <div
                        id="getstarted"
                        className="blackButton"
                        onClick={() => history.push('/start')}
                    >
                        Get started
                    </div>
                    <div id="menu" className="navBtn">
                        <img
                            src={require('../../../public/images/menu.svg')}
                            onClick={openMenu}
                        />
                    </div>
                </div>
            )}
        </header>
    )
}

export default observer(Header)
