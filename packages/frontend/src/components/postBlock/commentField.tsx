import { useContext } from 'react'
import { observer } from 'mobx-react-lite'

import UserContext from '../../context/User'
import PostContext from '../../context/Post'

import { Post, DataType, Page } from '../../constants'
import WritingField from '../writingField/writingField'

type Props = {
    post: Post
    closeComment: () => void
    page: Page
}

const CommentField = (props: Props) => {
    const userContext = useContext(UserContext)
    const postContext = useContext(PostContext)

    const preventPropagation = (event: any) => {
        event.stopPropagation()
    }

    const submitComment = async (
        title: string = '',
        content: string,
        epkNonce: number,
        reputation: number
    ) => {
        if (!userContext.userState) {
            console.error('user not login!')
        } else if (content.length === 0) {
            console.error('nothing happened, no input.')
        } else {
            if (!props.post.id || !content) {
                throw new Error('invalid data for comment')
            }

            postContext.leaveComment(
                content,
                props.post.id,
                epkNonce,
                reputation
            )
            props.closeComment()
        }
    }

    return (
        <div className="comment-field">
            <WritingField
                type={DataType.Comment}
                submit={submitComment}
                submitBtnName="Comment - 3 points"
                onClick={preventPropagation}
            />
        </div>
    )
}

export default observer(CommentField)
