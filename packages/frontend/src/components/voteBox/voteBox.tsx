import { useState, useContext, useEffect } from 'react'
import 'react-circular-progressbar/dist/styles.css'

import UserContext from '../../context/User'
import PostContext from '../../context/Post'
import { shortenEpochKey } from '../../utils'

type Props = {
    isUpvote: boolean
    closeVote: () => void
    dataId: string
    isPost: boolean
}
const VoteBox = ({ isUpvote, closeVote, dataId, isPost }: Props) => {
    const userContext = useContext(UserContext)
    const postContext = useContext(PostContext)
    const [givenAmount, setGivenAmount] = useState<number>(1)
    const [epkNonce, setEpkNonce] = useState(0)
    const [isHistoriesOpen, setHistoriesOpen] = useState(false)
    const [voteHistories, setVoteHistories] = useState(() => {
        return [] as any[]
    })
    const votes =
        (isPost ? postContext.votesByPostId : postContext.votesByCommentId)[
            dataId
        ] || []

    const isAvailable = isPost
        ? userContext.currentEpoch ===
          postContext.postsById[dataId].current_epoch
        : userContext.currentEpoch ===
          postContext.commentsById[dataId].current_epoch

    useEffect(() => {
        if (isPost) {
            postContext.loadVotesForPostId(dataId)
        } else {
            postContext.loadVotesForCommentId(dataId)
        }
    }, [])

    const doVote = async () => {
        if (!userContext.userState) {
            console.error('user not login!')
        } else if (givenAmount === undefined) {
            console.error('no enter any given amount')
        } else if (isAvailable) {
            const upvote = isUpvote ? givenAmount : 0
            const downvote = isUpvote ? 0 : givenAmount
            const obj = isPost
                ? postContext.postsById[dataId]
                : postContext.commentsById[dataId]
            if ((upvote === 0 && downvote === 0) || !obj.epoch_key) {
                throw new Error('invalid data for vote')
            }

            postContext.vote(
                isPost ? dataId : '',
                isPost ? '' : dataId,
                obj.epoch_key,
                epkNonce,
                upvote,
                downvote
            )
            closeVote()
        }
    }

    const preventClose = (event: any) => {
        event.stopPropagation()
    }

    const changeGivenAmount = (event: any) => {
        if (
            event.target.value === '' ||
            (event.target.value <= 10 && event.target.value >= 1)
        ) {
            setGivenAmount(Number(event.target.value))
        }
    }

    const close = (event: any) => {
        preventClose(event)
        closeVote()
    }
    if (!userContext.userState) return <div />

    return (
        <div className="vote-overlay" onClick={close}>
            <div className="vote-box" onClick={preventClose}>
                <div className="grey-box">
                    <div className="close">
                        <img
                            src={require('../../../public/images/close-white.svg')}
                            onClick={close}
                        />
                    </div>
                    <div className="title">
                        <img
                            src={require(`../../../public/images/${
                                isUpvote ? 'boost' : 'squash'
                            }-fill.svg`)}
                        />
                        {isUpvote ? 'Boost' : 'Squash'}
                    </div>
                    <div className="description">
                        Tune up the amount of Rep to{' '}
                        {isUpvote ? 'boost' : 'squash'} this post
                    </div>
                    <div className="counter">
                        <input
                            type="number"
                            min="1"
                            max="10"
                            step="1"
                            value={givenAmount}
                            onChange={changeGivenAmount}
                        />
                        <div className="counter-btns">
                            <div
                                className="counter-btn add"
                                onClick={() => {
                                    setGivenAmount(
                                        givenAmount < 10
                                            ? givenAmount + 1
                                            : givenAmount
                                    )
                                }}
                            >
                                <img
                                    src={require('../../../public/images/arrow-up.svg')}
                                />
                            </div>
                            <div
                                className="counter-btn minus"
                                onClick={() => {
                                    setGivenAmount(
                                        givenAmount > 1
                                            ? givenAmount - 1
                                            : givenAmount
                                    )
                                }}
                            >
                                <img
                                    src={require('../../../public/images/arrow-down.svg')}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="epks">
                        {userContext.currentEpochKeys.map((key, i) => (
                            <div
                                className={
                                    epkNonce === i ? 'epk chosen' : 'epk'
                                }
                                key={key}
                                onClick={() => setEpkNonce(i)}
                            >
                                {shortenEpochKey(key)}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="white-box">
                    <div
                        className={isAvailable ? 'submit' : 'submit outdated'}
                        onClick={doVote}
                    >
                        {isAvailable ? "Yep, let's do it." : 'Outdated'}
                    </div>
                    <div className="histories">
                        <div
                            className="main-btn"
                            onClick={() => setHistoriesOpen(!isHistoriesOpen)}
                        >
                            <div className="btn-name">
                                <p className="title">History</p>
                                <p className="description">{`You have ${
                                    voteHistories.length > 0 ? '' : 'not '
                                }${
                                    isUpvote ? 'boosted' : 'squashed'
                                } this before`}</p>
                            </div>
                            <img
                                src={require(`../../../public/images/arrow-tri-${
                                    isHistoriesOpen ? 'up' : 'down'
                                }.svg`)}
                            />
                        </div>
                        {isHistoriesOpen ? (
                            <div className="histories-list">
                                {votes.map((id, i) => {
                                    const v = postContext.votesById[id]
                                    const shown =
                                        (isUpvote && v.posRep > 0) ||
                                        (!isUpvote && v.negRep > 0)
                                    return shown ? (
                                        <div className="record" key={i}>
                                            <div className="record-epk">
                                                {
                                                    postContext.votesById[id]
                                                        .voter
                                                }
                                            </div>
                                            <span>
                                                {isUpvote ? v.posRep : v.negRep}
                                            </span>
                                            <img
                                                src={require(`../../../public/images/${
                                                    isUpvote
                                                        ? 'boost'
                                                        : 'squash'
                                                }-fill.svg`)}
                                            />
                                        </div>
                                    ) : null
                                })}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default VoteBox
