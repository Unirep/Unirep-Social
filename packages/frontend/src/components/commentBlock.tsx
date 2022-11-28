// import BlockButton from './blockButton';
import { useState, useContext } from 'react'
import { HashLink as Link } from 'react-router-hash-link'
import dateformat from 'dateformat'
import { observer } from 'mobx-react-lite'
import MarkdownIt from 'markdown-it'

import UnirepContext from '../context/Unirep'
import PostContext from '../context/Post'
import UserContext from '../context/User'

import { EXPLORER_URL, DELETED_CONTENT } from '../config'
import MyButton, { MyButtonType } from './myButton'
import AlertCover from './alertCover'
import WritingField from './writingField'
import CustomGap from './customGap'
import { DataType } from '../constants'
import { Page } from '../constants'
import BlockButton, { BlockButtonType } from './blockButton'

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
    const userContext = useContext(UserContext)
    const comment = postContext.commentsById[commentId]
    const commentHtml = markdown.render(comment.content)
    const unirepConfig = useContext(UnirepContext)
    const date = dateformat(new Date(comment.createdAt), 'dd/mm/yyyy hh:MM TT')
    const [isEpkHovered, setEpkHovered] = useState<boolean>(false)
    const [isEdited, setIsEdited] = useState<boolean>(false)
    const [alertOn, setAlertOn] = useState<boolean>(false)
    const isAuthor = userContext.allEpks?.includes(comment.epoch_key)
    const commentCondition =
        comment.lastUpdatedAt && comment.lastUpdatedAt > comment.createdAt
            ? comment.content === DELETED_CONTENT
                ? '  (Deleted)'
                : '  (Edited)'
            : ''

    const scrollWithOffset = (el: any) => {
        const yCoordinate = el.getBoundingClientRect().top + window.pageYOffset
        const yOffset = -180
        window.scrollTo({ top: yCoordinate + yOffset, behavior: 'smooth' })
    }

    const editComment = () => {
        setIsEdited(true)
    }

    const updateComment = (
        title: string,
        content: string,
        epkNonce: number,
        reputation: number
    ) => {
        postContext.editComment(comment.id, content, comment.epoch_key)
        setIsEdited(false)
    }

    const deleteComment = () => {
        postContext.deleteComment(comment.id, comment.epoch_key)
        setAlertOn(false)
        setIsEdited(false)
    }

    const preventPropagation = (event: any) => {
        event.stopPropagation()
    }

    return (
        <div className="comment-block">
            <div className="block-header comment-block-header no-padding">
                <div className="info">
                    <span className="date">
                        {date}
                        {commentCondition} |
                    </span>
                    <span
                        className="user"
                        onMouseEnter={() => setEpkHovered(true)}
                        onMouseLeave={() => setEpkHovered(false)}
                    >
                        Post by {comment.epoch_key}{' '}
                        <img
                            src={require('../../public/images/lighting.svg')}
                        />
                        {isEpkHovered && comment.reputation > 0 && (
                            <span className="show-off-rep">
                                {comment.reputation ===
                                unirepConfig.commentReputation
                                    ? `This person is very modest, showing off only ${unirepConfig.commentReputation} Rep.`
                                    : `This person is showing off ${comment.reputation} Rep.`}
                            </span>
                        )}
                    </span>
                </div>
                <a
                    className="etherscan"
                    target="_blank"
                    href={`${EXPLORER_URL}/tx/${comment.transactionHash}`}
                >
                    <span>Etherscan</span>
                    <img src={require('../../public/images/etherscan.svg')} />
                </a>
            </div>
            {page === Page.Post ? (
                <div className="block-content no-padding-horizontal">
                    <div
                        style={{
                            maxHeight: '300px',
                            overflow: 'hidden',
                        }}
                        dangerouslySetInnerHTML={{
                            __html: commentHtml,
                        }}
                    />
                </div>
            ) : (
                <Link
                    className="comment-block-link"
                    to={`/post/${comment.post_id}#${comment.id}`}
                    scroll={(el: any) => scrollWithOffset(el)}
                >
                    <div className="block-content block-content-on-hover no-padding-horizontal">
                        <div
                            style={{
                                maxHeight:
                                    page == Page.Home ? '300px' : undefined,
                                overflow: 'hidden',
                            }}
                            dangerouslySetInnerHTML={{
                                __html: commentHtml,
                            }}
                        />
                    </div>
                </Link>
            )}

            <div className="block-buttons no-padding">
                <BlockButton
                    type={BlockButtonType.Boost}
                    count={comment.upvote}
                    data={comment}
                />
                <BlockButton
                    type={BlockButtonType.Squash}
                    count={comment.downvote}
                    data={comment}
                />
                <BlockButton
                    type={BlockButtonType.Share}
                    count={0}
                    data={comment}
                />
                {isAuthor && (
                    <BlockButton
                        type={BlockButtonType.Edit}
                        data={comment}
                        edit={editComment}
                    />
                )}
            </div>
            {isEdited && (
                <div>
                    <WritingField
                        type={DataType.Comment}
                        submit={updateComment}
                        submitBtnName="Update Comment"
                        onClick={preventPropagation}
                        content={comment.content}
                        isEdit={true}
                    />
                    <CustomGap times={2} />

                    {comment.content !== DELETED_CONTENT && (
                        <MyButton
                            type={MyButtonType.light}
                            fullSize={true}
                            onClick={() => setAlertOn(true)}
                            fontWeight={600}
                            textAlignMiddle={true}
                        >
                            Delete Comment
                        </MyButton>
                    )}
                    {alertOn && (
                        <AlertCover
                            close={() => setAlertOn(false)}
                            deleteContent={deleteComment}
                        />
                    )}
                </div>
            )}
        </div>
    )
}

export default observer(CommentBlock)
