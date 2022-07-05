import { useEffect, useState, useContext } from 'react'
import { useHistory } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import UserContext from '../../context/User'

import { Post, Comment, ButtonType, DataType } from '../../constants'
import VoteBox from '../voteBox/voteBox'

type Props = {
    type: ButtonType
    count: number
    data: Post | Comment
}

const BlockButton = ({ type, count, data }: Props) => {
    const history = useHistory()
    const userContext = useContext(UserContext)
    const [isBoostOn, setBoostOn] = useState<boolean>(false)
    const [isSquashOn, setSquashOn] = useState<boolean>(false)
    const [isHover, setIsHover] = useState<boolean>(false) // null, purple1, purple2, grey1, grey2
    const [reminder, setReminder] = useState<string>('')
    const [isLinkCopied, setIsLinkCopied] = useState<boolean>(false) // only for share button

    const checkAbility = () => {
        if (type === ButtonType.Comments || type === ButtonType.Share) {
            return true
        } else {
            if (!userContext.userState) return false
            else {
                if (data.current_epoch !== userContext.currentEpoch)
                    return false
                else if (userContext.netReputation < 1) return false
                else return true
            }
        }
    }

    const onClick = () => {
        setIsHover(false)
        setReminder('')

        if (type === ButtonType.Comments) {
            history.push(`/post/${data.id}`, { commentId: '' })
        } else if (type === ButtonType.Boost) {
            setBoostOn(true)
        } else if (type === ButtonType.Squash) {
            setSquashOn(true)
        } else if (type === ButtonType.Share && data.type === DataType.Post) {
            navigator.clipboard.writeText(
                `${window.location.origin}/post/${data.id}`
            )
            setIsLinkCopied(true)
        } else if (
            type === ButtonType.Share &&
            data.type === DataType.Comment
        ) {
            navigator.clipboard.writeText(
                `${window.location.origin}/post/${(data as Comment).post_id}#${
                    data.id
                }`
            )
            setIsLinkCopied(true)
        } else if (type === ButtonType.Share) {
            throw new Error(`Unrecognized data type: ${JSON.stringify(data)}`)
        }
    }

    const onMouseOut = () => {
        setIsHover(false)
        setReminder('')
    }

    const setReminderMessage = () => {
        if (!userContext.userState) setReminder('Join us :)')
        else {
            if (data.current_epoch !== userContext.currentEpoch)
                setReminder('Time out :(')
            else if (userContext.netReputation < 1) setReminder('No enough Rep')
            else if (type !== ButtonType.Share) setReminder('loading...')
        }
    }

    useEffect(() => {
        if (isLinkCopied) {
            setReminder('Link Copied!')
            const timer = setTimeout(() => {
                setReminder('')
                setIsLinkCopied(false)
            }, 3000)

            return () => clearTimeout(timer)
        }
    }, [isLinkCopied])

    return (
        <div
            className={
                type === ButtonType.Share
                    ? 'block-button share'
                    : 'block-button'
            }
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={onMouseOut}
            onClick={onClick}
        >
            <img
                src={require(`../../../public/images/${type}${
                    isHover && checkAbility() ? '-fill' : ''
                }.svg`)}
            />
            {type !== ButtonType.Share ? (
                <span className="count">{count}</span>
            ) : (
                <span></span>
            )}
            <span className="btn-name">
                {type.charAt(0).toUpperCase() + type.slice(1)}
            </span>

            {checkAbility() ? (
                <div></div>
            ) : (
                <div
                    className="disabled"
                    onMouseEnter={setReminderMessage}
                ></div>
            )}
            {reminder.length > 0 ? (
                <div className="reminder">{reminder}</div>
            ) : (
                <div></div>
            )}
            {isBoostOn ? (
                <VoteBox
                    isUpvote={true}
                    closeVote={() => setBoostOn(false)}
                    dataId={data.id}
                    isPost={data.type === DataType.Post}
                />
            ) : isSquashOn ? (
                <VoteBox
                    isUpvote={false}
                    closeVote={() => setSquashOn(false)}
                    dataId={data.id}
                    isPost={data.type === DataType.Post}
                />
            ) : (
                <div></div>
            )}
        </div>
    )
}

export default observer(BlockButton)
