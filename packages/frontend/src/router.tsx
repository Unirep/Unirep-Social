import { BrowserRouter, Switch, Route, Redirect } from 'react-router-dom'
import { useState } from 'react'

import useLocalStorage from './hooks/useLocalStorage'
import * as Constants from './constants'

import Header from './layout/header/header'
import MainPage from './pages/mainPage/mainPage'
import PostPage from './pages/postPage/postPage'
import UserPage from './pages/userPage/userPage'
import LoginPage from './pages/loginPage/loginPage'
import SignupPage from './pages/signupPage/signupPage'
import NewPage from './pages/newPage/newPage'
import FeedbackPage from './pages/feedbackPage/feedbackPage'
import AdminPage from './pages/adminPage/adminPage'
import SettingPage from './pages/settingPage/settingPage'

import { WebContext } from './context/WebContext'
import Favicon from 'react-favicon'

const AppRouter = () => {
    const [adminCode, setAdminCode] = useLocalStorage('admin', '')
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [page, setPage] = useState(Constants.Page.Home)

    return (
        <BrowserRouter>
            <div>
                <Favicon url={require('../public/favicon.ico')} />
                <WebContext.Provider
                    value={{
                        isMenuOpen,
                        setIsMenuOpen,
                        page,
                        setPage,
                        adminCode,
                        setAdminCode,
                    }}
                >
                    <Header />

                    <Switch>
                        <Route component={MainPage} path="/" exact={true} />
                        <Route component={PostPage} path="/post/:id" />
                        <Route component={UserPage} path="/user" />
                        <Route component={LoginPage} path="/login" />
                        <Route component={SignupPage} path="/signup" />
                        <Route component={NewPage} path="/new" />
                        <Route component={FeedbackPage} path="/feedback" />
                        <Route component={AdminPage} path="/admin" />
                        <Route component={SettingPage} path="/setting" />
                        <Route component={() => <Redirect to="/" />} />
                    </Switch>
                </WebContext.Provider>
            </div>
        </BrowserRouter>
    )
}

export default AppRouter
