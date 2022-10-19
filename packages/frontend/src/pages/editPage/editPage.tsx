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

const EditPage = () => {
    const { id } = useParams<Params>()
    const history = useHistory()
    const postContext = useContext(PostContext)
    const userContext = useContext(UserContext)
    const [alertOn, setAlertOn] = useState<boolean>(false)

    useEffect(() => {
        postContext.loadPost(id)
    }, [])

    const preventPropagation = (event: any) => {
        event.stopPropagation()
    }

    const deletePost = () => {
        console.log('delete post')
        setAlertOn(false)
    }

    const submit = (
        title: string,
        content: string,
        epkNonce: number,
        reputation: number
    ) => {
        const post = postContext.postsById[id]
        const index = userContext.currentEpochKeys.findIndex(
            (k) => k === post.epoch_key
        )
        postContext.editPost(id, title, content, index ?? 0)
        history.goBack()
    }

    return (
        <BasicPage hasBack={true} title={'Update Post'}>
            {postContext.postsById[id] ? (
                <WritingField
                    type={DataType.Post}
                    submit={submit}
                    submitBtnName="Update Post"
                    onClick={preventPropagation}
                    title={postContext.postsById[id].title}
                    content={postContext.postsById[id].content}
                    isEdit={true}
                />
            ) : (
                <div>loading...</div>
            )}
            <CustomGap times={2} />
            {postContext.postsById[id] && (
                <MyButton
                    type={MyButtonType.light}
                    fullSize={true}
                    onClick={() => setAlertOn(true)}
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
