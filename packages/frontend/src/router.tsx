import { BrowserRouter, Switch, Route, Redirect } from 'react-router-dom'
import { useState } from 'react'

import useLocalStorage from './hooks/useLocalStorage'
import * as Constants from './constants'
import Header from './layout/header/header'
import TopicsMenu from './components/topicsMenu'
import MainPage from './pages/mainPage/mainPage'
import PostPage from './pages/postPage/postPage'
import EditPage from './pages/editPage/editPage'
import UserPage from './pages/userPage/userPage'
import NewPage from './pages/newPage/newPage'
import FeedbackPage from './pages/feedbackPage/feedbackPage'
import AdminPage from './pages/adminPage/adminPage'
import SettingPage from './pages/settingPage/settingPage'
import StartPage from './pages/startPage/startPage'

import TopicPage from './pages/topicPage/topicPage'

import { WebContext } from './context/WebContext'
import Favicon from 'react-favicon'
const Favicon_ = Favicon as any

const AppRouter = () => {
    const [adminCode, setAdminCode] = useLocalStorage('admin', '')
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [page, setPage] = useState(Constants.Page.Home)

    return (
        <BrowserRouter>
            <div>
                <Favicon_ url={require('../public/favicon.ico')} />
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
                    <TopicsMenu />

                    <Switch>
                        <Route component={MainPage} path="/" exact={true} />
                        <Route component={StartPage} path="/start" />
                        <Route component={StartPage} path="/start/callback" />
                        <Route component={PostPage} path="/post/:id" />
                        <Route component={EditPage} path="/edit/:id" />
                        <Route component={UserPage} path="/user" />
                        <Route component={NewPage} path="/:topicId/new" />
                        <Route component={FeedbackPage} path="/feedback" />
                        <Route component={AdminPage} path="/admin" />
                        <Route component={SettingPage} path="/setting" />

                        <Route component={TopicPage} path="/:topicId" />

                        <Route component={() => <Redirect to="/" />} />
                    </Switch>
                </WebContext.Provider>
            </div>
        </BrowserRouter>
    )
}

export default AppRouter
