import { useEffect, useContext } from 'react'
import { useParams } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import PostContext from '../../context/Post'

import { Page, Params } from '../../constants'
import PostBlock from '../../components/postBlock/postBlock'
import BasicPage from '../basicPage/basicPage'

const PostPage = () => {
    const { id } = useParams<Params>()
    const postContext = useContext(PostContext)

    useEffect(() => {
        postContext.loadPost(id)
    }, [])

    return (
        <BasicPage>
            {!postContext.postsById[id] ? (
                <div>Loading...</div>
            ) : (
                <PostBlock postId={id} page={Page.Post} />
            )}
        </BasicPage>
    )
}

export default observer(PostPage)
