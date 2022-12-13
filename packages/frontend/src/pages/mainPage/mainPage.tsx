import { useContext, useState, useEffect } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import PostContext from '../../context/Post'
import UserContext from '../../context/User'
import UnirepContext from '../../context/Unirep'

import { QueryType, AlertType } from '../../constants'
import BasicPage from '../basicPage/basicPage'
import PostsList from '../../components/postsList'
import Feed from '../../components/feed'

const MainPage = (topic: any) => {
    const history = useHistory()
    const location = useLocation()
    const postContext = useContext(PostContext)
    const userContext = useContext(UserContext)
    const unirepConfig = useContext(UnirepContext)

    const [query, setQuery] = useState<QueryType>(QueryType.New)

    useEffect(() => {
        loadMorePosts(topic)
    }, [topic])

    const loadMorePosts = (topic: any) => {
        console.log(topic.topic)
        const topicName = topic.topic
        if (typeof topicName === 'undefined') {
            console.log('query in the undefined topic logic:', query)
            postContext.loadFeed(query, postContext.feedsByQuery[query] || [])
        } else {
            console.log('loading topic feed....')
            postContext.loadFeedByTopic(
                topicName,
                postContext.feedsByTopic[topic] || []
            )
        }
    }

    const gotoNewPost = () => {
        if (
            userContext.userState &&
            userContext.spendableReputation >= unirepConfig.postReputation
        ) {
            // pass topic state to new page
            history.push(
                {
                    pathname: '/new',
                    state: { topic: topic },
                },
                { isConfirmed: true }
            )
        } else {
            console.log(userContext.id)
        }
    }

    return (
        <BasicPage>
            <div className="create-post" onClick={gotoNewPost}>
                {!userContext.userState
                    ? AlertType.postNotLogin
                    : userContext.spendableReputation <
                      unirepConfig.postReputation
                    ? AlertType.postNotEnoughPoints
                    : 'Create post'}
            </div>
            <Feed feedChoice={query} setFeedChoice={setQuery} />
            <PostsList
                postIds={postContext.feedsByQuery[query] || []}
                loadMorePosts={loadMorePosts}
            />
        </BasicPage>
    )
}

export default observer(MainPage)
