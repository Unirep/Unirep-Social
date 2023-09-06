import { createRoot } from 'react-dom/client'
import AppRouter from './router'
import 'bootstrap/dist/css/bootstrap.min.css'
import './app.scss'
import { configure } from 'mobx'

configure({
    enforceActions: 'never',
})

const rootElement = document.getElementById('root')
if (rootElement) {
    const root = createRoot(rootElement)
    root.render(<AppRouter />)
}
