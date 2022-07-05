import { useContext, useState, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import PostContext from '../../context/Post'
import UserContext from '../../context/User'
import UnirepContext from '../../context/Unirep'

import { QueryType, AlertType } from '../../constants'
import BasicPage from '../basicPage/basicPage'
import PostsList from '../../components/postsList/postsList'
import Feed from '../../components/feed/feed'

const MainPage = () => {
    const history = useHistory()
    const postController = useContext(PostContext)
    const userContext = useContext(UserContext)
    const unirepConfig = useContext(UnirepContext)

    const [query, setQuery] = useState<QueryType>(QueryType.New)

    const loadMorePosts = () => {
        console.log(
            'load more posts, now posts: ' +
                postController.feedsByQuery[query]?.length
        )
        const lastPostId = [...postController.feedsByQuery[query]].pop()
        postController.loadFeed(query, lastPostId)
    }

    useEffect(() => {
        postController.loadFeed(query)
    }, [query])

    const gotoNewPost = () => {
        if (
            userContext.userState &&
            userContext.netReputation >= unirepConfig.postReputation
        ) {
            history.push('/new', { isConfirmed: true })
        } else {
            console.log(userContext.id)
        }
    }

    return (
        <BasicPage>
            <div className="create-post" onClick={gotoNewPost}>
                {!userContext.userState
                    ? AlertType.postNotLogin
                    : userContext.netReputation < unirepConfig.postReputation
                    ? AlertType.postNotEnoughPoints
                    : 'Create post'}
            </div>
            <Feed feedChoice={query} setFeedChoice={setQuery} />
            <PostsList
                postIds={postController.feedsByQuery[query] || []}
                loadMorePosts={loadMorePosts}
            />
        </BasicPage>
    )
}

export default observer(MainPage)
