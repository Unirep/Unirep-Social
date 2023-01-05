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

    // Get the current screen width
    const [screenWidth, setScreenWidth] = useState(window.innerWidth)

    // Add a event listener to update the screen width when the window is resized
    useEffect(() => {
        const handleResize = () => setScreenWidth(window.innerWidth)
        window.addEventListener('resize', handleResize)
        return () => {
            window.removeEventListener('resize', handleResize)
        }
    }, [])

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
                    {screenWidth < 680 ? (
                        // Render a dropdown menu when the screen width is below 680px
                        <select
                            value={selected}
                            onChange={(event) => {
                                const topicId = event.target.value
                                goToTopic(topicId)
                                setSelected(topicId)
                            }}
                        >
                            {Topics.map((topic) => (
                                <option key={topic.id} value={topic.id}>
                                    {topic.name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        // Render a list of buttons when the screen width is above 680px
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
                    )}
                </div>
            ) : (
                <div></div>
            )}
        </div>
    )
}
export default TopicsMenu
