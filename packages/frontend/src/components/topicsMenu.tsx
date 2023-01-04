import { useHistory, useLocation } from 'react-router-dom'
import { Topics } from '../constants'
import { useState, useEffect } from 'react'

const TopicsMenu = () => {
    const history = useHistory()
    const location = useLocation()
    const [selected, setSelected] = useState('')

    const goToTopic = (topicId: string) => {
        history.push(`/${topicId}`, { isConfirmed: true })
    }

    const generalTopicId = Topics.find((topic) => topic.name === 'General')?.id

    useEffect(() => {
        if (location.pathname === '/') {
            setSelected('')
        }
    }, [location.pathname])

    return (
        <div>
            {location.pathname !== '/user' &&
            location.pathname !== '/setting' ? (
                <div className="topics-menu">
                    <div className="topic-buttons">
                        {Topics.map((topic) => (
                            <div
                                key={topic.id}
                                className={`topic ${
                                    selected === topic.id ||
                                    (location.pathname === '/' &&
                                        topic.id === generalTopicId)
                                        ? 'selected'
                                        : ''
                                }`}
                                onClick={() => {
                                    goToTopic(topic.id)
                                    setSelected(topic.id)
                                }}
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
