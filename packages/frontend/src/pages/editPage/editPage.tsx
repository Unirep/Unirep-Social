import { useContext, useEffect, useState } from 'react'
import { useParams, useHistory } from 'react-router-dom'

import PostContext from '../../context/Post'
import UserContext from '../../context/User'
import { Params } from '../../constants'

import BasicPage from '../basicPage/basicPage'
import WritingField from '../../components/writingField'
import MyButton, { MyButtonType } from '../../components/myButton'
import CustomGap from '../../components/customGap'
import AlertCover from '../../components/alertCover'
import { DataType } from '../../constants'
import { DELETED_CONTENT } from '../../config'

const EditPage = () => {
    const { id } = useParams<Params>()
    const history = useHistory()
    const postContext = useContext(PostContext)
    const post = postContext.postsById[id]
    const [alertOn, setAlertOn] = useState<boolean>(false)

    useEffect(() => {
        postContext.loadPost(id)
    }, [])

    const preventPropagation = (event: any) => {
        event.stopPropagation()
    }

    const deletePost = () => {
        setAlertOn(false)
        postContext.deletePost(id, post.epoch_key)
        history.goBack()
    }

    const submit = (
        title: string,
        content: string,
        topic: string,
        epkNonce: number,
        reputation: number
    ) => {
        if (content === post.content) return

        postContext.editPost(id, title, content, post.epoch_key)
        history.goBack()
    }

    return (
        <BasicPage hasBack={true} title={'Update Post'}>
            {post ? (
                <WritingField
                    type={DataType.Post}
                    submit={submit}
                    submitBtnName="Update Post"
                    onClick={preventPropagation}
                    title={post.title}
                    content={post.content}
                    isEdit={true}
                />
            ) : (
                <div>loading...</div>
            )}
            <CustomGap times={2} />
            {post && post.content !== DELETED_CONTENT && (
                <MyButton
                    type={MyButtonType.light}
                    fullSize={true}
                    onClick={() => setAlertOn(true)}
                    fontWeight={600}
                    textAlignMiddle={true}
                >
                    Delete Post
                </MyButton>
            )}
            {alertOn && (
                <AlertCover
                    close={() => setAlertOn(false)}
                    deleteContent={deletePost}
                />
            )}
        </BasicPage>
    )
}

export default EditPage
