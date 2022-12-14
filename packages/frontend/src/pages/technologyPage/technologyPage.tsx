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
        setTopic(topicName)
    }, [topic])

    console.log('topic being given ----->', topic)

    return <MainPage topic={topic} />
}

export default observer(TechnologyPage)
