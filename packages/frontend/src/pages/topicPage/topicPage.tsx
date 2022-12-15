import { useParams, useLocation } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import MainPage from '../mainPage/mainPage'

const TopicPage = () => {
    const { topicId }: any = useParams()

    const topic: any = {
        id: topicId,
    }

    return <MainPage topic={topic.id} />
}

export default observer(TopicPage)
