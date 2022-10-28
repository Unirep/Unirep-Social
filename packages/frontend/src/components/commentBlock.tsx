// import BlockButton from './blockButton';
import { useState, useContext } from 'react'
import { HashLink as Link } from 'react-router-hash-link'
import dateformat from 'dateformat'
import { observer } from 'mobx-react-lite'
import MarkdownIt from 'markdown-it'

import UnirepContext from '../context/Unirep'
import PostContext from '../context/Post'
import UserContext from '../context/User'

import { EXPLORER_URL } from '../config'
import { Page, ButtonType } from '../constants'
import BlockButton from './blockButton'
import MyButton, { MyButtonType } from './myButton'
import AlertCover from './alertCover'
import WritingField from './writingField'
import CustomGap from './customGap'
import { DataType } from '../constants'

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

    // const gotoPost = () => {
    //     if (page === Page.User) {
    //         history.push(`/post/${comment.post_id}`, { commentId: comment.id })
    //     }
    // }

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
        console.log('delete comment')
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
                    <span className="date">{date} |</span>
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
            <Link
                className="comment-block-link"
                to={`/post/${comment.post_id}#${comment.id}`}
            >
                <div className="block-content no-padding-horizontal">
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
            </Link>
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
                <BlockButton type={ButtonType.Share} data={comment} />
                {isAuthor && (
                    <BlockButton
                        type={ButtonType.Edit}
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
                    <MyButton
                        type={MyButtonType.light}
                        fullSize={true}
                        onClick={() => setAlertOn(true)}
                    >
                        Delete Comment
                    </MyButton>
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
