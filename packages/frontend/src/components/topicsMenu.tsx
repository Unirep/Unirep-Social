import { useHistory } from 'react-router-dom'

// todo: make this more dynamic and export it somewhere else
export const topics = [
    {
        id: 'philosophy',
        name: 'Philosophy',
    },
    {
        id: 'technology',
        name: 'Technology',
    },
    {
        id: 'politics',
        name: 'Politics',
    },
    {
        id: 'music',
        name: 'Music',
    },
    {
        id: 'business',
        name: 'Business',
    },
    {
        id: 'literature',
        name: 'Literature',
    },
    {
        id: 'fitness',
        name: 'Fitness',
    },
    {
        id: 'photography',
        name: 'Photography',
    },
    {
        id: 'news',
        name: 'News',
    },
]

const TopicsMenu = () => {
    const history = useHistory()

    const goToTopic = (topicId: string) => {
        history.push(`/${topicId}`, { isConfirmed: true })
    }

    return (
        <div className="topics-menu">
            <div className="topic-buttons">
                {topics.map((topic) => (
                    <div key={topic.id} onClick={() => goToTopic(topic.id)}>
                        {topic.name}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default TopicsMenu
