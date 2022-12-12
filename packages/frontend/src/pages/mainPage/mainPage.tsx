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

// todo: the logic will be refactored to call `postContext.loadFeedByTopic`

const MainPage = () => {
    const history = useHistory()
    const location = useLocation()
    const postContext = useContext(PostContext)
    const userContext = useContext(UserContext)
    const unirepConfig = useContext(UnirepContext)

    const [query, setQuery] = useState<QueryType>(QueryType.New)
    const [topic, setTopic] = useState('')

    const loadMorePosts = () => {
        console.log(
            'load more posts, now posts: ' +
                postContext.feedsByQuery[query]?.length
        )
        postContext.loadFeed(query, postContext.feedsByQuery[query])
    }

    useEffect(() => {
        const pathname = location.pathname // will be '/topic'
        const topic = pathname.split('/')[1] // this will be 'topic'
        setTopic(topic)
    }, [])

    const gotoNewPost = () => {
        if (
            userContext.userState &&
            userContext.spendableReputation >= unirepConfig.postReputation
        ) {
            // history.push('/new', { isConfirmed: true })
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
