import { useContext, useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'

import UserContext from '../../context/User'

import { ActionType } from '../../constants'
import { getRecords } from '../../utils'

import BasicPage from '../basicPage/basicPage'
import { Record, Page, QueryType } from '../../constants'
import ActivityWidget from './activityWidget'
import CustomGap from '../../components/customGap'
import PostsList from '../../components/postsList'
import CommentsList from '../../components/commentsList'
import PostContext from '../../context/Post'

enum Tag {
    Posts = 'Posts',
    Comments = 'Comments',
    Activity = 'Activity',
}

type Props = {
    spent: number
    total: number
    action: number
}

const RepPortion = ({ spent, total, action }: Props) => {
    const [isHover, setHover] = useState<boolean>(false)
    const portionName =
        action === 2
            ? 'Boost'
            : action === 3
            ? 'Squash'
            : action === 0
            ? 'Post'
            : 'Comment'

    return (
        <div
            className="rep-portion"
            style={{ width: `${(spent / total) * 100}%` }}
            onMouseEnter={() => setHover(true)}
            onMouseOut={() => setHover(false)}
            onClick={() => setHover(!isHover)}
        >
            {isHover && (
                <div className="rep-description">
                    <img
                        src={require(`../../../public/images/${
                            portionName === 'Post' || portionName === 'Comment'
                                ? 'unirep'
                                : portionName.toLowerCase()
                        }-white.svg`)}
                    />
                    {portionName}:<span>{spent}</span>
                </div>
            )}
        </div>
    )
}

const UserPage = () => {
    const user = useContext(UserContext)
    const postContext = useContext(PostContext)
    const [records, setRecords] = useState<Record[]>([])
    const [tag, setTag] = useState<Tag>(Tag.Posts)
    const [sort, setSort] = useState<QueryType>(QueryType.Boost)
    const [isDropdown, setIsDropdown] = useState<boolean>(false)

    const [received, setReceived] = useState<number[]>([0, 0, 0]) // airdrop, boost, squash
    const [spent, setSpent] = useState<number[]>([0, 0, 0, 0]) // post, comment, boost, squash
    const [spentFromSubsidy, setSpentFromSubsidy] = useState<number[]>([
        0, 0, 0, 0,
    ]) // post, comment, boost, squash

    const getUserPosts = async (sort: QueryType, lastRead = [] as string[]) => {
        await user.loadingPromise
        await postContext.loadFeed(sort, lastRead, user.allEpks)
    }

    const getUserComments = async (
        sort: QueryType,
        lastRead = [] as string[]
    ) => {
        await user.loadingPromise
        await postContext.loadComments(sort, lastRead, user.allEpks)
    }

    const getUserRecords = async () => {
        if (!user.userState || !user.identity) return

        let r: number[] = [0, 0, 0]
        let s: number[] = [0, 0, 0, 0]
        let subsidySpent: number[] = [0, 0, 0, 0]

        user.currentEpochKeys.forEach((epk) => {
            if (user.recordsByEpk[epk]) {
                user.recordsByEpk[epk].forEach((record) => {
                    if (record.action === ActionType.Post) {
                        if (record.spentFromSubsidy) {
                            subsidySpent[0] += record.downvote
                        } else {
                            s[0] += record.downvote
                        }
                    } else if (record.action === ActionType.Comment) {
                        if (record.spentFromSubsidy) {
                            subsidySpent[1] += record.downvote
                        } else {
                            s[1] += record.downvote
                        }
                    } else if (record.action === ActionType.UST) {
                        r[0] += record.upvote
                    } else if (record.action === ActionType.Vote) {
                        if (record.from === epk && record.spentFromSubsidy) {
                            subsidySpent[2] += record.upvote
                            subsidySpent[3] += record.downvote
                        } else if (
                            record.from === epk &&
                            !record.spentFromSubsidy
                        ) {
                            s[2] += record.upvote
                            s[3] += record.downvote
                        } else if (record.to === epk) {
                            r[1] += record.upvote
                            r[2] += record.downvote
                        }
                    }
                })
            }
        })

        let rs: Record[] = []
        user.allEpks.forEach((epk) => {
            if (user.recordsByEpk[epk]) {
                rs = [...rs, ...user.recordsByEpk[epk]]
            }
        })
        setReceived(r)
        setSpent(s)
        setSpentFromSubsidy(subsidySpent)
        resortRecords(QueryType.New, rs)
    }

    const resortRecords = (s: QueryType, hs: Record[]) => {
        if (s === QueryType.New) {
            hs.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
        } else if (s === QueryType.Rep) {
            hs.sort((a, b) =>
                a.upvote + a.downvote > b.upvote + b.downvote ? -1 : 1
            )
        }
        setRecords(hs)
    }

    useEffect(() => {
        const getUserData = async () => {
            await Promise.all([
                getUserPosts(sort),
                getUserComments(sort),
                getUserRecords(),
            ])
        }

        getUserData()
    }, [])

    const switchDropdown = () => {
        if (isDropdown) {
            setIsDropdown(false)
        } else {
            setIsDropdown(true)
        }
    }

    const setTagPage = (tag: Tag) => {
        setTag(tag)
        if (tag === Tag.Activity) {
            setSort(QueryType.New)
        } else {
            setSort(QueryType.Boost)
        }
    }

    const setSortType = async (s: QueryType) => {
        setSort(s)
        if (tag === Tag.Posts || tag === Tag.Comments) {
            await getUserPosts(s)
            await getUserComments(s)
        } else {
            resortRecords(s, records)
        }

        setIsDropdown(false)
    }

    const loadMorePosts = async () => {
        let posts =
            postContext.feedsByQuery[postContext.feedKey(sort, user.allEpks)] ??
            []
        if (posts.length > 0) {
            await getUserPosts(
                sort,
                postContext.feedsByQuery[
                    postContext.feedKey(sort, user.allEpks)
                ]
            )
        } else {
            await getUserPosts(sort)
        }
    }

    const loadMoreComments = async () => {
        let comments =
            postContext.commentsByQuery[
                postContext.feedKey(sort, user.allEpks)
            ] ?? []
        if (comments.length > 0) {
            await getUserComments(
                sort,
                postContext.commentsByQuery[
                    postContext.feedKey(sort, user.allEpks)
                ]
            )
        } else {
            await getUserComments(sort)
        }
    }
    if (!user.userState)
        return (
            <BasicPage>
                <div />
            </BasicPage>
        )

    return (
        <BasicPage>
            <h3>My Stuff</h3>
            <div className="my-stuff">
                <div className="my-reps stuff">
                    <div className="white-block">
                        <p>My Rep</p>
                        <div className="rep-info">
                            <img
                                src={require('../../../public/images/lighting.svg')}
                            />
                            {user.netReputation}
                        </div>
                    </div>
                    <div className="grey-block">
                        <div className="title-sm">How I used it</div>
                        <div className="rep-details">
                            <div className="rep-bar-title">
                                <img
                                    src={require('../../../public/images/lighting.svg')}
                                />
                                Rep
                            </div>
                            <div className="rep-bar">
                                {spent.map((s, i) => (
                                    <RepPortion
                                        spent={s}
                                        total={user.reputation}
                                        action={i}
                                        key={i}
                                    />
                                ))}
                            </div>
                        </div>
                        <CustomGap times={1} />
                        <div className="rep-details">
                            <div className="rep-bar-title">
                                <img
                                    src={require('../../../public/images/unirep.svg')}
                                />
                                Rep-Handout
                            </div>
                            <div className="rep-bar">
                                {spentFromSubsidy.map((s, i) => (
                                    <RepPortion
                                        spent={s}
                                        total={30}
                                        action={i}
                                        key={i}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{ width: '16px' }}></div>{' '}
                <div className="received stuff">
                    <div className="grey-block">
                        <p>Received</p>
                        <div className="rep-received">
                            {received[0] + received[1] - received[2]}
                        </div>
                        <span>
                            This Rep is in the vault. It will be yours in the
                            next cycle.
                        </span>
                    </div>
                    <div className="white-block">
                        <div className="received-info">
                            <span>
                                <img
                                    src={require('../../../public/images/unirep.svg')}
                                />
                                Rep Reset
                            </span>
                            <div className="amount">+{received[0]}</div>
                        </div>
                        <CustomGap times={2} />
                        <div className="received-info">
                            <span>
                                <img
                                    src={require('../../../public/images/boost.svg')}
                                />
                                Boost
                            </span>
                            <div className="amount">+{received[1]}</div>
                        </div>
                        <CustomGap times={2} />
                        <div className="received-info">
                            <span>
                                <img
                                    src={require('../../../public/images/squash.svg')}
                                />
                                Squash
                            </span>
                            <div className="amount">-{received[2]}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="user-page-header">
                <div className="tags header-child">
                    <div
                        className={tag === Tag.Posts ? 'tag underline' : 'tag'}
                        onClick={() => setTagPage(Tag.Posts)}
                    >
                        Posts
                    </div>
                    <div className="line"></div>
                    <div
                        className={
                            tag === Tag.Comments ? 'tag underline' : 'tag'
                        }
                        onClick={() => setTagPage(Tag.Comments)}
                    >
                        Comments
                    </div>
                    <div className="line"></div>
                    <div
                        className={
                            tag === Tag.Activity ? 'tag underline' : 'tag'
                        }
                        onClick={() => setTagPage(Tag.Activity)}
                    >
                        Activity
                    </div>
                </div>
                {isDropdown ? (
                    tag !== Tag.Activity ? (
                        <div
                            className="dropdown isDropdown header-child"
                            onClick={switchDropdown}
                            style={{ height: `${40 * 3}px` }}
                        >
                            <div
                                className="menu-choice"
                                onClick={() => setSortType(QueryType.Boost)}
                            >
                                <img
                                    src={require('../../../public/images/boost-fill.svg')}
                                />
                                Boost
                            </div>
                            <div
                                className="menu-choice"
                                onClick={() => setSortType(QueryType.New)}
                            >
                                <img
                                    src={require('../../../public/images/new-fill.svg')}
                                />
                                New
                            </div>
                            <div
                                className="menu-choice"
                                onClick={() => setSortType(QueryType.Squash)}
                            >
                                <img
                                    src={require('../../../public/images/squash-fill.svg')}
                                />
                                Squash
                            </div>
                        </div>
                    ) : (
                        <div
                            className="dropdown isDropdown header-child"
                            onClick={switchDropdown}
                            style={{ height: `${40 * 2}px` }}
                        >
                            <div
                                className="menu-choice"
                                onClick={() => setSortType(QueryType.New)}
                            >
                                <img
                                    src={require('../../../public/images/new-fill.svg')}
                                />
                                New
                            </div>
                            <div
                                className="menu-choice"
                                onClick={() => setSortType(QueryType.Rep)}
                            >
                                <img
                                    src={require('../../../public/images/unirep-fill.svg')}
                                />
                                Rep
                            </div>
                        </div>
                    )
                ) : (
                    <div
                        className="dropdown header-child"
                        onClick={switchDropdown}
                    >
                        <div className="menu-choice isChosen">
                            <img
                                src={require(`../../../public/images/${
                                    sort === QueryType.Rep ? 'unirep' : sort
                                }-fill.svg`)}
                            />
                            <span>
                                {sort.charAt(0).toUpperCase() + sort.slice(1)}
                            </span>
                            <img
                                src={require('../../../public/images/arrow-down.svg')}
                            />
                        </div>
                    </div>
                )}
            </div>
            <div className="user-page-content">
                {tag === Tag.Posts ? (
                    <PostsList
                        postIds={
                            postContext.feedsByQuery[
                                postContext.feedKey(sort, user.allEpks)
                            ] ?? []
                        }
                        loadMorePosts={loadMorePosts}
                    />
                ) : tag === Tag.Comments ? (
                    <CommentsList
                        commentIds={
                            postContext.commentsByQuery[
                                postContext.feedKey(sort, user.allEpks)
                            ] ?? []
                        }
                        page={Page.User}
                        loadMoreComments={loadMoreComments}
                    />
                ) : (
                    <div>
                        {records.map((h) => (
                            <ActivityWidget
                                key={h.createdAt}
                                record={h}
                                isSpent={user.allEpks.indexOf(h.from) !== -1}
                            />
                        ))}
                    </div>
                )}
            </div>
        </BasicPage>
    )
}

export default observer(UserPage)
