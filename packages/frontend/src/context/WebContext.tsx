import { createContext } from 'react'
import { Page } from '../constants'

type GlobalContent = {
    isMenuOpen: boolean
    setIsMenuOpen: (value: boolean) => void
    page: Page
    setPage: (value: Page) => void
    adminCode: string
    setAdminCode: (value: string) => void
}

export const WebContext = createContext<GlobalContent>({
    isMenuOpen: false,
    setIsMenuOpen: () => {},
    page: Page.Home,
    setPage: () => {},
    adminCode: '',
    setAdminCode: () => {},
})
