import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import MainPage from '../mainPage/mainPage'

const TechnologyPage = () => {
    const location = useLocation()

    const [topic, setTopic] = useState('')

    useEffect(() => {
        const pathname = location.pathname // will be '/topic'
        const topicName = pathname.split('/')[1] // this will be 'topic'
        // prevent memory leak? not sure is this is necessary or only a local error
        setTopic(topicName)

        // clean up state to ensure no memory leaks
        // return () => {
        //     setTopic('')
        // }
    }, [])

    return <MainPage topic={topic} />
}

export default observer(TechnologyPage)
