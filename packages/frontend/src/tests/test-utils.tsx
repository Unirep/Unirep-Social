// currently working on wrapper (if needed for future tests)
import React, { FC, ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter, Switch, Route, Redirect } from 'react-router-dom'
import { useState } from 'react'

import useLocalStorage from '../hooks/useLocalStorage'
import * as Constants from '../constants'

// import Header from '../layout/header/header'
// import MainPage from '../pages/mainPage/mainPage'
// import PostPage from '../pages/postPage/postPage'
// import UserPage from '../pages/userPage/userPage'
// import LoginPage from '../pages/loginPage/loginPage'
// import SignupPage from '../pages/signupPage/signupPage'
// import NewPage from '../pages/newPage/newPage'
// import FeedbackPage from '../pages/feedbackPage/feedbackPage'
// import AdminPage from '../pages/adminPage/adminPage'
// import SettingPage from '../pages/settingPage/settingPage'
// import { WebContext } from '../context/WebContext'

import Favicon from 'react-favicon'
const Favicon_ = Favicon as any

const AllTheProviders: FC<{ children: React.ReactNode }> = ({ children }) => {
    const [adminCode, setAdminCode] = useLocalStorage('admin', '')
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [page, setPage] = useState(Constants.Page.Home)

    return (
        // <BrowserRouter>
        //         <WebContext.Provider
        //                 value={{
        //                     isMenuOpen,
        //                     setIsMenuOpen,
        //                     page,
        //                     setPage,
        //                     adminCode,
        //                     setAdminCode,
        //             }}
        //         >
        //             {children}
        //         </WebContext.Provider >
        // </BrowserRouter>
        <Favicon_ url={'string'} />
    )
}

const customRender = (
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
