import { useParams, useLocation, Redirect } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { topics } from '../../components/topicsMenu'
import MainPage from '../mainPage/mainPage'

const TopicPage = () => {
    const { topicId }: any = useParams()

    const isValidTopic = topics.some((t) => t.id === topicId)

    if (!isValidTopic) {
        return <Redirect to="/" />
    }

    const topic: any = {
        id: topicId,
    }

    return <MainPage topic={topic.id} />
}

export default observer(TopicPage)
