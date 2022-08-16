import { useState, useEffect, useContext } from 'react'
import { HashLink as Link } from 'react-router-hash-link'
import dateformat from 'dateformat'
import MarkdownIt from 'markdown-it'

import { ActionType } from '../../context/Queue'
import PostContext from '../../context/Post'
import { Record, titlePrefix, titlePostfix } from '../../constants'

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
        dateformat(new Date(record.time), 'dd/mm/yyyy hh:MM TT')
    )

    const translateInfo = (h: Record) => {
        if (h.action === ActionType.Post) {
            return { who: 'I (' + h.from + ')', action: 'created a post' }
        } else if (h.action === ActionType.Comment) {
            return { who: 'I (' + h.from + ')', action: 'commented on a post' }
        } else if (h.action === ActionType.UST) {
            return { who: 'UniRep Social', action: 'Epoch Rep drop' }
        } else if (h.action === ActionType.Signup) {
            return { who: 'Unirep Social', action: 'Sign Up Rep drop' }
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
        if (record.data_id === '0') {
            return '/user'
        } else {
            if (postContext.postsById[record.data_id])
                return `/post/${record.data_id}`
            else if (postContext.commentsById[record.data_id])
                return `/post/${
                    postContext.commentsById[record.data_id].post_id
                }#${record.data_id}`
            else return ''
        }
    })
    const [actionData, setActionData] = useState<ActionData>(() => {
        if (record.content === undefined || record.content.length === 0)
            return { title: '', content: '' }

        let i = record.content.indexOf(titlePrefix)
        let j = record.content.indexOf(titlePostfix)
        if (i === -1 || j === -1)
            return { title: '', content: markdown.render(record.content) }
        i = i + titlePrefix.length
        return {
            title: record.content.substring(i, j),
            content: markdown.render(
                record.content.substring(j + titlePostfix.length)
            ),
        }
    })

    useEffect(() => {
        setInfo(translateInfo(record))
    }, [record])

    return (
        <Link className="link" to={goto}>
            <div className="activity-widget">
                {isSpent ? (
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
                ) : (
                    <div></div>
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
                        {record.content !== undefined &&
                        record.content.length > 0 ? (
                            actionData.title.length > 1 ? (
                                <div className="data">
                                    <div className="title">
                                        {actionData.title}
                                    </div>
                                    <div
                                        className="content"
                                        dangerouslySetInnerHTML={{
                                            __html: actionData.content,
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="data">
                                    <div
                                        className="content"
                                        dangerouslySetInnerHTML={{
                                            __html: actionData.content,
                                        }}
                                    />
                                </div>
                            )
                        ) : (
                            <div></div>
                        )}
                    </div>
                </div>
                {isSpent ? (
                    <div></div>
                ) : (
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
