import { useHistory } from 'react-router-dom'

const TopicsMenu = () => {
    const history = useHistory()

    const goToTopic = (topicId: string) => {
        history.push(`/${topicId}`, { isConfirmed: true })
    }

    return (
        <div className="topics-menu">
            <div className="topic-buttons">
                <div onClick={() => goToTopic('philosophy')}>Philosophy</div>
                <div onClick={() => goToTopic('technology')}>Technology</div>
                <div onClick={() => goToTopic('politics')}>Politics</div>
                <div onClick={() => goToTopic('music')}>Music</div>
                <div onClick={() => goToTopic('business')}>Business</div>
                <div onClick={() => goToTopic('literature')}>Literature</div>
                <div onClick={() => goToTopic('fitness')}>Fitness</div>
                <div onClick={() => goToTopic('photography')}>Photography</div>
                <div onClick={() => goToTopic('news')}>News</div>
            </div>
        </div>
    )
}

export default TopicsMenu
