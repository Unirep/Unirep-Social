// import BlockButton from './blockButton';
import { useState, useContext } from 'react'
import { useHistory } from 'react-router-dom'
import dateformat from 'dateformat'
import { observer } from 'mobx-react-lite'

import UnirepContext from '../../context/Unirep'
import PostContext from '../../context/Post'

import { EXPLORER_URL } from '../../config'
import { Page, ButtonType } from '../../constants'
import BlockButton from './blockButton'
import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({
    breaks: true,
    html: false,
    linkify: true,
})

type Props = {
    commentId: string
    page: Page
}

const CommentBlock = ({ commentId, page }: Props) => {
    const postContext = useContext(PostContext)
    const comment = postContext.commentsById[commentId]
    const commentHtml = markdown.render(comment.content)
    const unirepConfig = useContext(UnirepContext)
    const date = dateformat(new Date(comment.post_time), 'dd/mm/yyyy hh:MM TT')
    const history = useHistory()
    const [isEpkHovered, setEpkHovered] = useState<boolean>(false)

    const gotoPost = () => {
        if (page === Page.User) {
            history.push(`/post/${comment.post_id}`, { commentId: comment.id })
        }
    }

    return (
        <div className="comment-block">
            <div className="block-header comment-block-header no-padding">
                <div className="info">
                    <span className="date">{date} |</span>
                    <span
                        className="user"
                        onMouseEnter={() => setEpkHovered(true)}
                        onMouseLeave={() => setEpkHovered(false)}
                    >
                        Post by {comment.epoch_key}{' '}
                        <img
                            src={require('../../../public/images/lighting.svg')}
                        />
                        {isEpkHovered ? (
                            <span className="show-off-rep">
                                {comment.reputation ===
                                unirepConfig.commentReputation
                                    ? `This person is very modest, showing off only ${unirepConfig.commentReputation} Rep.`
                                    : `This person is showing off ${comment.reputation} Rep.`}
                            </span>
                        ) : (
                            <span></span>
                        )}
                    </span>
                </div>
                <a
                    className="etherscan"
                    target="_blank"
                    href={`${EXPLORER_URL}/tx/${comment.id}`}
                >
                    <span>Etherscan</span>
                    <img
                        src={require('../../../public/images/etherscan.svg')}
                    />
                </a>
            </div>
            <div
                className="block-content no-padding-horizontal"
                onClick={gotoPost}
            >
                <div
                    style={{
                        maxHeight: page == Page.Home ? '300px' : undefined,
                        overflow: 'hidden',
                    }}
                    dangerouslySetInnerHTML={{
                        __html: commentHtml,
                    }}
                />
            </div>
            <div className="block-buttons no-padding">
                <BlockButton
                    type={ButtonType.Boost}
                    count={comment.upvote}
                    data={comment}
                />
                <BlockButton
                    type={ButtonType.Squash}
                    count={comment.downvote}
                    data={comment}
                />
                <BlockButton type={ButtonType.Share} count={0} data={comment} />
            </div>
        </div>
    )
}

export default observer(CommentBlock)
