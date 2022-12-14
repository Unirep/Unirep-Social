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

type Props = {
    topic: string
}

// topic being passed in by TopicPage which is handling location state props
const MainPage = ({ topic }: Props) => {
    console.log('<----- topic being received', topic)
    const history = useHistory()
    const location = useLocation()
    const postContext = useContext(PostContext)
    const userContext = useContext(UserContext)
    const unirepConfig = useContext(UnirepContext)

    const [query, setQuery] = useState<QueryType>(QueryType.New)

    useEffect(() => {
        loadMorePosts(topic)
    }, [topic])

    const loadMorePosts = async (topic: string) => {
        if (typeof topic === 'undefined') {
            await postContext.loadFeed(
                query,
                postContext.feedsByQuery[query] || []
            )
        } else {
            await postContext.loadFeedByTopic(
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
                    state: { topic: topic },
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
            {typeof topic === 'undefined' ? (
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
