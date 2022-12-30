import { useHistory } from 'react-router-dom'
import { Topics } from '../constants'

const TopicsMenu = () => {
    const history = useHistory()

    const goToTopic = (topicId: string) => {
        history.push(`/${topicId}`, { isConfirmed: true })
    }

    return (
        <div className="topics-menu">
            <div className="topic-buttons">
                {Topics.map((topic) => (
                    <div key={topic.id} onClick={() => goToTopic(topic.id)}>
                        {topic.name}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default TopicsMenu
