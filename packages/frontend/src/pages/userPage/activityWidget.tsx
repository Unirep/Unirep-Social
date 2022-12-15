import { useState, useEffect, useContext } from 'react'
import { HashLink as Link } from 'react-router-hash-link'
import dateformat from 'dateformat'
import MarkdownIt from 'markdown-it'
import { ActionType } from '@unirep-social/core'

import { Record } from '../../constants'
import PostContext from '../../context/Post'

type Props = {
    record: Record
    isSpent: boolean
}

type Info = {
    who: string
    action: string
}

type ActionData = {
    title: string
    content: string
}

const markdown = new MarkdownIt({
    breaks: true,
    html: false,
    linkify: true,
})

const ActivityWidget = ({ record, isSpent }: Props) => {
    const postContext = useContext(PostContext)

    const [date, setDate] = useState<string>(
        dateformat(record.createdAt, 'dd/mm/yyyy hh:MM TT')
    )

    const translateInfo = (h: Record) => {
        if (h.action === ActionType.Post) {
            return { who: 'I (' + h.from + ')', action: 'created a post' }
        } else if (h.action === ActionType.Comment) {
            return { who: 'I (' + h.from + ')', action: 'commented on a post' }
        } else if (h.action === ActionType.Airdrop) {
            return { who: 'UniRep Social', action: 'Epoch Rep drop' }
        } else if (h.action === ActionType.Signup) {
            return { who: 'Unirep Social', action: 'Sign Up Rep drop' }
        } else if (h.action === ActionType.EditPost) {
            return { who: 'I (' + h.from + ')', action: 'edited a post' }
        } else if (h.action === ActionType.DeletePost) {
            return { who: 'I (' + h.from + ')', action: 'deleted a post' }
        } else if (h.action === ActionType.EditComment) {
            return { who: 'I (' + h.from + ')', action: 'edited a comment' }
        } else if (h.action === ActionType.DeleteComment) {
            return { who: 'I (' + h.from + ')', action: 'deleted a comment' }
        } else {
            if (isSpent) {
                return {
                    who: 'I (' + h.from + ')',
                    action:
                        h.upvote > 0
                            ? 'boosted this post'
                            : 'squashed this post',
                }
            } else {
                return {
                    who: h.from,
                    action:
                        h.upvote > 0
                            ? 'boosted this post'
                            : 'squashed this post',
                }
            }
        }
    }

    const [info, setInfo] = useState<Info>(() => translateInfo(record))
    const [goto, setGoto] = useState<string>(() => {
        if (record.data === '0') {
            return '/user'
        } else {
            if (postContext.postsById[record.data])
                return `/post/${record.data}`
            else if (postContext.commentsById[record.data])
                return `/post/${
                    postContext.commentsById[record.data].post_id
                }#${record.data}`
            else return ''
        }
    })
    const [actionData, setActionData] = useState<ActionData>(() => {
        return {
            title: record.title ?? '',
            content: record.content ? markdown.render(record.content) : '',
        }
    })

    useEffect(() => {
        setInfo(translateInfo(record))
    }, [record])

    return (
        <Link className="link" to={goto}>
            <div className="activity-widget">
                {isSpent &&
                    (record.action === ActionType.Post ||
                        record.action === ActionType.Comment ||
                        record.action === ActionType.Vote) && (
                        <div className="side">
                            <div className="amount">
                                {record.downvote + record.upvote}
                            </div>
                            <div className="type">
                                <img
                                    src={
                                        record.action === ActionType.Vote
                                            ? record.upvote > 0
                                                ? require('../../../public/images/boost.svg')
                                                : require('../../../public/images/squash.svg')
                                            : require('../../../public/images/unirep.svg')
                                    }
                                />
                                Used
                            </div>
                        </div>
                    )}
                <div className="main">
                    <div className="header">
                        <p>{date}</p>
                        <div className="etherscan">
                            Etherscan{' '}
                            <img
                                src={require('../../../public/images/etherscan.svg')}
                            />
                        </div>
                    </div>
                    <div className="main-info">
                        <div className="who">
                            {info.who}{' '}
                            <img
                                src={require('../../../public/images/lighting.svg')}
                            />{' '}
                            {info.action}
                        </div>
                        <div className="data">
                            {actionData.title.length > 1 && (
                                <div className="title">{actionData.title}</div>
                            )}
                            {record.content !== undefined &&
                                record.content.length > 0 && (
                                    <div
                                        className="content"
                                        dangerouslySetInnerHTML={{
                                            __html: actionData.content,
                                        }}
                                    />
                                )}
                        </div>
                    </div>
                </div>
                {!isSpent &&
                    (record.action === ActionType.Vote ||
                        record.action === ActionType.Airdrop) && (
                        <div className="side">
                            <div className="amount">
                                {record.action === ActionType.Vote
                                    ? record.upvote > 0
                                        ? '+' + record.upvote
                                        : '-' + record.downvote
                                    : '+' + record.upvote}
                            </div>
                            <div className="type">
                                <img
                                    src={
                                        record.action === ActionType.Vote
                                            ? record.upvote > 0
                                                ? require('../../../public/images/boost.svg')
                                                : require('../../../public/images/squash.svg')
                                            : require('../../../public/images/unirep.svg')
                                    }
                                />
                                Received
                            </div>
                        </div>
                    )}
            </div>
        </Link>
    )
}

export default ActivityWidget
