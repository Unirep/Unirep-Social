import { useContext, useState, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import PostContext from '../../context/Post'
import UserContext from '../../context/User'
import UnirepContext from '../../context/Unirep'

import { QueryType, AlertType, Topics } from '../../constants'
import BasicPage from '../basicPage/basicPage'
import PostsList from '../../components/postsList'
import Feed from '../../components/feed'
import CustomGap from '../../components/customGap'

type Props = {
    topic?: string
}

const HomePage = ({ topic }: Props) => {
    const history = useHistory()
    const postContext = useContext(PostContext)
    const userContext = useContext(UserContext)
    const unirepConfig = useContext(UnirepContext)

    const [query, setQuery] = useState<QueryType>(QueryType.New)
    const [isDropdown, setDropdown] = useState<boolean>(false)

    useEffect(() => {
        loadMorePosts()
    }, [topic, query])

    const loadMorePosts = () => {
        const key = `${query}${topic ? '-' + topic : ''}`
        console.log(key)
        postContext.loadFeed(query, topic, postContext.feeds[key] || [])
    }

    const gotoNewPost = () => {
        if (
            userContext.userState &&
            userContext.spendableReputation >= unirepConfig.postReputation
        ) {
            // pass topic state to new page
            history.push('/new', { isConfirmed: true })
        } else {
            console.log(userContext.id)
        }
    }

    const gotoTopic = (chosenTopic?: string) => {
        if (chosenTopic) {
            history.push(`/${chosenTopic}`)
        } else {
            history.push('/')
        }
    }

    const formatTopic = (topic: string) => {
        return topic.charAt(0).toUpperCase() + topic.slice(1)
    }

    const formattedTopic = topic ? formatTopic(topic) : '[Choose a topic]'

    return (
        <>
            <BasicPage>
                <div className="create-post" onClick={gotoNewPost}>
                    {!userContext.userState
                        ? AlertType.postNotLogin
                        : userContext.spendableReputation <
                          unirepConfig.postReputation
                        ? AlertType.postNotEnoughPoints
                        : 'Create post'}
                </div>
                <CustomGap times={4} />
                <div className="interline"></div>
                <CustomGap times={4} />
                {isDropdown ? (
                    <div
                        className="dropdown"
                        onClick={() => setDropdown(false)}
                    >
                        <div className="choice" onClick={() => gotoTopic()}>
                            {'[Choose a topic]'}
                        </div>
                        {Topics.map((t) => (
                            <div
                                className="choice"
                                onClick={() => gotoTopic(t.id)}
                            >
                                {formatTopic(t.name)}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="dropdown" onClick={() => setDropdown(true)}>
                        <div className="choice isChosen">
                            <img
                                src={require('../../../public/images/arrow-down.svg')}
                            />
                            {formattedTopic}
                            <img
                                src={require('../../../public/images/arrow-down.svg')}
                            />
                        </div>
                    </div>
                )}

                <Feed feedChoice={query} setFeedChoice={setQuery} />
                <PostsList
                    postIds={
                        postContext.feeds[postContext.feedKey(query, topic)] ||
                        []
                    }
                    loadMorePosts={loadMorePosts}
                />
            </BasicPage>
        </>
    )
}
export default observer(HomePage)
