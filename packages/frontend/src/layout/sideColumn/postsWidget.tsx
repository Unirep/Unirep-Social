import { useContext } from 'react'
import { useHistory } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import UserContext from '../../context/User'
import PostContext from '../../context/Post'
import { Post } from '../../constants'

type Props = {
    post: Post
    ranking: number
    hasUnderline: boolean
}

const isAuthor = (p: Post, epks: undefined | string[]) => {
    if (epks !== undefined) {
        return epks.indexOf(p.epoch_key) > -1
    } else {
        return false
    }
}

const RankingBlock = observer(({ post, ranking, hasUnderline }: Props) => {
    const userContext = useContext(UserContext)
    const history = useHistory()

    return (
        <div
            className={
                hasUnderline ? 'ranking-block underline' : 'ranking-block'
            }
            onClick={() => history.push('/post/' + post.id)}
        >
            <div className="ranking-block-header">
                <div className="ranking">
                    <img
                        src={require('../../../public/images/boost-fill.svg')}
                    />
                    {`#${ranking + 1}${
                        isAuthor(post, userContext.allEpks) ? ', by you' : ''
                    }`}
                </div>
                <div className="boost">{post.upvote - post.downvote}</div>
            </div>
            <div className="ranking-block-content">
                <h4>{post.title}</h4>
                <p>{post.content}</p>
            </div>
        </div>
    )
})

const PostsWidget = () => {
    const postContext = useContext(PostContext)

    const sortByBoost = (a: Post, b: Post) => {
        if (a.upvote - a.downvote >= b.upvote - b.downvote) return -1
        else return 1
    }

    return (
        <div className="posts-widget widget">
            <h3>Post ranking</h3>
            {Object.values(postContext.postsById)
                .sort(sortByBoost)
                .map((post, i) => (
                    <RankingBlock
                        post={post}
                        ranking={i}
                        hasUnderline={true}
                        key={post.id}
                    />
                ))}
        </div>
    )
}

export default observer(PostsWidget)
