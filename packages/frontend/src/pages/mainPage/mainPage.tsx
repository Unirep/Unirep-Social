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

// topic being passed in by TopicPage which is handling location state props
const MainPage = (topic: any) => {
    const history = useHistory()
    const location = useLocation()
    const postContext = useContext(PostContext)
    const userContext = useContext(UserContext)
    const unirepConfig = useContext(UnirepContext)

    const [query, setQuery] = useState<QueryType>(QueryType.New)

    let topicName: any

    useEffect(() => {
        topicName = topic.topic

        console.log('return statement in MainPage', topicName)
        loadMorePosts(topicName)
    }, [topic])

    const loadMorePosts = (topic: any) => {
        if (typeof topic === 'undefined') {
            console.log('query in the undefined topic logic:', query)
            postContext.loadFeed(query, postContext.feedsByQuery[query] || [])
        } else {
            console.log('loading topic feed....')
            postContext.loadFeedByTopic(
                topic,
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
                    state: { topic: topicName },
                },
                { isConfirmed: true }
            )
        } else {
            console.log(userContext.id)
        }
    }

    // todo: fix problem with rendering relevant topic posts

    // todo: maybe re-render with a useEffect when the topic changes

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
            {/* if topicName is undefined then we are on a 'no-topic' page */}
            {typeof topicName === 'undefined' ? (
                <PostsList
                    postIds={postContext.feedsByQuery[query] || []}
                    loadMorePosts={loadMorePosts}
                />
            ) : (
                <PostsList
                    postIds={postContext.feedsByTopic[topic] || []}
                    loadMorePosts={loadMorePosts}
                />
            )}
        </BasicPage>
    )
}

export default observer(MainPage)
