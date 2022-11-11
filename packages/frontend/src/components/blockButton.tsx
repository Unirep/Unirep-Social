import { useEffect, useState, useContext } from 'react'
import { useHistory } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import UserContext from '../context/User'

import { Post, Comment, DataType } from '../constants'
import VoteBox from './voteBox'

export enum BlockButtonType {
    Comments = 'comments',
    Boost = 'boost',
    Squash = 'squash',
    Share = 'share',
    Post = 'post',
    Activity = 'activity',
    Save = 'save',
    Edit = 'edit',
}

type Props = {
    type: BlockButtonType
    count?: number
    data: Post | Comment
    edit?: () => void
}

const BlockButton = ({ type, count, data, edit }: Props) => {
    const history = useHistory()
    const userContext = useContext(UserContext)
    const [isBoostOn, setBoostOn] = useState<boolean>(false)
    const [isSquashOn, setSquashOn] = useState<boolean>(false)
    const [isHover, setIsHover] = useState<boolean>(false) // null, purple1, purple2, grey1, grey2
    const [reminder, setReminder] = useState<string>('')
    const [isLinkCopied, setIsLinkCopied] = useState<boolean>(false) // only for share button

    const checkAbility = () => {
        if (
            type === BlockButtonType.Comments ||
            type === BlockButtonType.Share ||
            type === BlockButtonType.Edit
        ) {
            return true
        } else {
            if (!userContext.userState) return false
            else {
                if (data.current_epoch !== userContext.currentEpoch)
                    return false
                else if (userContext.spendableReputation < 1) return false
                else return true
            }
        }
    }

    const onClick = () => {
        setIsHover(false)
        setReminder('')

        if (type === BlockButtonType.Comments) {
            history.push(`/post/${data.id}`)
        } else if (type === BlockButtonType.Boost) {
            setBoostOn(true)
        } else if (type === BlockButtonType.Squash) {
            setSquashOn(true)
        } else if (
            type === BlockButtonType.Share &&
            data.type === DataType.Post
        ) {
            navigator.clipboard.writeText(
                `${window.location.origin}/post/${data.id}`
            )
            setIsLinkCopied(true)
        } else if (
            type === BlockButtonType.Share &&
            data.type === DataType.Comment
        ) {
            navigator.clipboard.writeText(
                `${window.location.origin}/post/${(data as Comment).post_id}#${
                    data.id
                }`
            )
            setIsLinkCopied(true)
        } else if (type === BlockButtonType.Share) {
            throw new Error(`Unrecognized data type: ${JSON.stringify(data)}`)
        } else if (type === BlockButtonType.Edit) {
            if (edit) edit()
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
            else if (userContext.spendableReputation < 1)
                setReminder('No enough Rep')
            else if (type !== BlockButtonType.Share) setReminder('loading...')
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
                type === BlockButtonType.Share || type === BlockButtonType.Edit
                    ? 'block-button share'
                    : 'block-button'
            }
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={onMouseOut}
            onClick={onClick}
        >
            <img
                src={require(`../../public/images/${type}${
                    isHover && checkAbility() ? '-fill' : ''
                }.svg`)}
            />
            {type !== BlockButtonType.Share &&
                type !== BlockButtonType.Edit && (
                    <span className="count">{count}</span>
                )}
            <span className="btn-name">
                {type.charAt(0).toUpperCase() + type.slice(1)}
            </span>

            {checkAbility() === false && (
                <div
                    className="disabled"
                    onMouseEnter={setReminderMessage}
                ></div>
            )}
            {reminder.length > 0 && <div className="reminder">{reminder}</div>}
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
