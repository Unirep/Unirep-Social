import { useEffect, useState, useContext } from 'react'
import { useHistory } from 'react-router-dom'
import dateformat from 'dateformat'
import { observer } from 'mobx-react-lite'

import UserContext from '../../context/User'
import UnirepContext from '../../context/Unirep'
import PostContext from '../../context/Post'

import { EXPLORER_URL } from '../../config'
import { Page, ButtonType, AlertType, DataType } from '../../constants'
import CommentField from './commentField'
import CommentBlock from './commentBlock'
import BlockButton from './blockButton'
import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({
    breaks: true,
    html: false,
    linkify: true,
})

type AlertProps = {
    type: AlertType
}

const AlertBox = ({ type }: AlertProps) => {
    return (
        <div className="alert">
            <img
                src={require(`../../../public/images/${
                    type === AlertType.commentNotEnoughPoints
                        ? 'lighting'
                        : 'glasses'
                }.svg`)}
            />
            {type}
        </div>
    )
}

type Props = {
    postId: string
    page: Page
}

const PostBlock = ({ postId, page }: Props) => {
    const history = useHistory()
    const userContext = useContext(UserContext)
    const postContext = useContext(PostContext)
    const post = postContext.postsById[postId]
    const postHtml = markdown.render(post.content)
    const comments = postContext.commentsByPostId[postId] || []

    const date = dateformat(new Date(post.post_time), 'dd/mm/yyyy hh:MM TT')
    const [showCommentField, setShowCommentField] = useState<boolean>(
        postContext.commentDraft.content.length > 0
    )
    const [isEpkHovered, setEpkHovered] = useState<boolean>(false)
    const unirepConfig = useContext(UnirepContext)

    useEffect(() => {
        postContext.loadCommentsByPostId(postId)
    }, [])

    const gotoPostPage = () => {
        if (page === Page.Post) return
        history.push(`/post/${post.id}`, { commentId: '' })
    }

    return (
        <div className="post-block">
            <div className="block-header">
                <div className="info">
                    <span className="date">{date} |</span>
                    <span
                        className="user"
                        onMouseEnter={() => setEpkHovered(true)}
                        onMouseLeave={() => setEpkHovered(false)}
                        onClick={() => setEpkHovered(!isEpkHovered)}
                        // title={post.reputation === DEFAULT_POST_KARMA? `This person is very modest, showing off only ${DEFAULT_POST_KARMA} Rep.` : `This person is showing off ${post.reputation} Rep.`}
                    >
                        Post by {post.epoch_key}{' '}
                        <img
                            src={require('../../../public/images/lighting.svg')}
                        />
                        {isEpkHovered ? (
                            <span className="show-off-rep">
                                {post.reputation === unirepConfig.postReputation
                                    ? `This person is very modest, showing off only ${unirepConfig.postReputation} Rep.`
                                    : `This person is showing off ${post.reputation} Rep.`}
                            </span>
                        ) : (
                            <span></span>
                        )}
                    </span>
                </div>
                <a
                    className="etherscan"
                    target="_blank"
                    href={`${EXPLORER_URL}/tx/${post.id}`}
                >
                    <span>Etherscan</span>
                    <img
                        src={require('../../../public/images/etherscan.svg')}
                    />
                </a>
            </div>
            {page === Page.Home ? <div className="divider"></div> : <div></div>}
            <div className="block-content" onClick={gotoPostPage}>
                <div className="title">{post.title}</div>
                <div className="content">
                    <div
                        style={{
                            maxHeight: page == Page.Home ? '300px' : undefined,
                            overflow: 'hidden',
                        }}
                        dangerouslySetInnerHTML={{
                            __html: postHtml,
                        }}
                    />
                </div>
            </div>
            {page === Page.Home ? <div className="divider"></div> : <div></div>}
            <div className="block-buttons">
                <BlockButton
                    type={ButtonType.Comments}
                    count={post.commentCount}
                    data={post}
                />
                <BlockButton
                    type={ButtonType.Boost}
                    count={post.upvote}
                    data={post}
                />
                <BlockButton
                    type={ButtonType.Squash}
                    count={post.downvote}
                    data={post}
                />
                <BlockButton type={ButtonType.Share} count={0} data={post} />
            </div>
            {page === Page.Home ? (
                <div></div>
            ) : (
                <div className="comment">
                    <div className="comment-block">
                        {!userContext.userState ? (
                            <AlertBox type={AlertType.commentNotLogin} />
                        ) : userContext.netReputation <
                          unirepConfig.commentReputation ? (
                            <AlertBox type={AlertType.commentNotEnoughPoints} />
                        ) : showCommentField ? (
                            <CommentField
                                post={post}
                                page={Page.Post}
                                closeComment={() => setShowCommentField(false)}
                            />
                        ) : (
                            <textarea
                                placeholder="What do you think?"
                                onClick={() => setShowCommentField(true)}
                            />
                        )}
                    </div>
                    <div className="divider"></div>
                    {comments.length > 0 ? (
                        <div className="comments-list">
                            {comments.map((id, i) => (
                                <div key={id} id={id}>
                                    <CommentBlock page={page} commentId={id} />
                                    {i < comments.length - 1 ? (
                                        <div className="divider"></div>
                                    ) : (
                                        <div></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-comments">
                            <img
                                src={require('../../../public/images/glasses.svg')}
                            />
                            <p>
                                Nothing to see here.
                                <br />
                                People are just being shy.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default observer(PostBlock)
