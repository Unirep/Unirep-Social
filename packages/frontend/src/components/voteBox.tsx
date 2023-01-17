import { useState, useContext, useEffect } from 'react'
import 'react-circular-progressbar/dist/styles.css'

import UserContext from '../context/User'
import PostContext from '../context/Post'
import ActionDetail from './actionDetail'
import MyButton, { MyButtonType } from './myButton'

type Props = {
    isUpvote: boolean
    closeVote: () => void
    dataId: string
    isPost: boolean
}
const VoteBox = ({ isUpvote, closeVote, dataId, isPost }: Props) => {
    const userContext = useContext(UserContext)
    const postContext = useContext(PostContext)

    const [useSubsidy, setUseSubsidy] = useState<boolean>(true)
    const [givenAmount, setGivenAmount] = useState<number>(1)
    const [epkNonce, setEpkNonce] = useState(-1)
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

    const isAuthor = userContext.currentEpochKeys?.includes(
        isPost
            ? postContext.postsById[dataId].epoch_key
            : postContext.commentsById[dataId].epoch_key
    )
    const [useUsername, setUseUsername] = useState<boolean>(false)

    useEffect(() => {
        if (isPost) {
            postContext.loadVotesForPostId(dataId)
        } else {
            postContext.loadVotesForCommentId(dataId)
        }
    }, [])

    const doVote = async () => {
        if (isAuthor) return
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
                downvote,
                0,
                useUsername ? userContext.username.username : '0'
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

    const chooseToUseSubsidy = () => {
        setUseSubsidy(true)
        setEpkNonce(-1)
    }

    const chooseToUsePersona = () => {
        setUseSubsidy(false)
        setEpkNonce(0)
    }

    return (
        <div className="vote-overlay" onClick={close}>
            <div className="vote-box" onClick={preventClose}>
                <div className="grey-box">
                    <div className="close">
                        <img
                            src={require('../../public/images/close-white.svg')}
                            onClick={close}
                        />
                    </div>
                    <div className="title">
                        <img
                            src={require(`../../public/images/${
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
                                    src={require('../../public/images/arrow-up.svg')}
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
                                    src={require('../../public/images/arrow-down.svg')}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="white-box">
                    <ActionDetail
                        showBorder={false}
                        showHelp={false}
                        showRep={false}
                        maxRep={userContext.netReputation}
                        defaultRep={1}
                        hasRep={
                            useSubsidy
                                ? userContext.subsidyReputation
                                : userContext.netReputation
                        }
                        showoffRep={0}
                        setShowoffRep={() => {}}
                        allEpks={userContext.currentEpochKeys}
                        useSubsidy={useSubsidy}
                        chooseToUseSubsidy={chooseToUseSubsidy}
                        chooseToUsePersona={chooseToUsePersona}
                        epkNonce={epkNonce}
                        setEpkNonce={setEpkNonce}
                        username={userContext.username.username}
                        showUsername={
                            !useSubsidy &&
                            userContext.username.epoch !== undefined &&
                            userContext.username.epoch <
                                userContext.currentEpoch
                        }
                        setUseUsername={setUseUsername}
                    />
                    <MyButton
                        type={MyButtonType.dark}
                        onClick={doVote}
                        fullSize={true}
                        textAlignMiddle={true}
                        disabled={isAuthor || !isAvailable}
                        fontSize={18}
                        fontWeight={600}
                    >
                        {isAuthor
                            ? `Can't ${
                                  isUpvote ? 'boost' : 'squash'
                              } on your own`
                            : isAvailable
                            ? "Yep, let's do it."
                            : 'Outdated'}
                    </MyButton>
                    <div className="histories">
                        <div
                            className="history-btn"
                            onClick={() => setHistoriesOpen(!isHistoriesOpen)}
                        >
                            <div className="history-btn-name">
                                <p className="title">History</p>
                                <p className="description">{`You have ${
                                    voteHistories.length > 0 ? '' : 'not '
                                }${
                                    isUpvote ? 'boosted' : 'squashed'
                                } this before`}</p>
                            </div>
                            <img
                                src={require(`../../public/images/arrow-tri-${
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
                                                {postContext.votesById[id]
                                                    .graffiti &&
                                                postContext.votesById[id]
                                                    .graffiti !== '0'
                                                    ? postContext.votesById[id]
                                                          .graffiti
                                                    : postContext.votesById[id]
                                                          .voter}
                                            </div>
                                            <span>
                                                {isUpvote ? v.posRep : v.negRep}
                                            </span>
                                            <img
                                                src={require(`../../public/images/${
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
