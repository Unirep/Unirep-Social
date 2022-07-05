import ReactDOM from 'react-dom'
import AppRouter from './router'
import 'bootstrap/dist/css/bootstrap.min.css'
import './app.scss'
import './context/EpochManager'
import { configure } from 'mobx'

configure({
    enforceActions: 'never',
})

ReactDOM.render(<AppRouter />, document.getElementById('root'))
