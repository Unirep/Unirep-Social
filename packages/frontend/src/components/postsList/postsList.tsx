import { observer } from 'mobx-react-lite'

import PostBlock from '../postBlock/postBlock'
import { Page } from '../../constants'
import { LOAD_POST_COUNT } from '../../config'

type Props = {
    postIds: string[]
    loadMorePosts: () => void
}

const PostsList = ({ postIds, loadMorePosts }: Props) => {
    return (
        <div className="post-list">
            {postIds.length > 0 ? (
                postIds.map((id, i) => (
                    <PostBlock key={id} postId={id} page={Page.Home} />
                ))
            ) : (
                <div className="no-posts">
                    <img src={require('../../../public/images/glasses.svg')} />
                    <p>
                        It's empty here.
                        <br />
                        People just being shy, no post yet.
                    </p>
                </div>
            )}
            {postIds.length > 0 && postIds.length % LOAD_POST_COUNT === 0 ? (
                <div className="load-more-button" onClick={loadMorePosts}>
                    Load more posts
                </div>
            ) : (
                <div></div>
            )}
        </div>
    )
}

export default observer(PostsList)
