import { useHistory, useLocation } from 'react-router-dom'
import { Topics } from '../constants'

const TopicsMenu = () => {
    const history = useHistory()
    const location = useLocation()

    const goToTopic = (topicId: string) => {
        history.push(`/${topicId}`, { isConfirmed: true })
    }

    return (
        <div>
            {location.pathname !== '/user' &&
            location.pathname !== '/setting' ? (
                <div className="topics-menu">
                    <div className="topic-buttons">
                        {Topics.map((topic) => (
                            <div
                                key={topic.id}
                                onClick={() => goToTopic(topic.id)}
                            >
                                {topic.name}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div></div>
            )}
        </div>
    )
}

export default TopicsMenu
