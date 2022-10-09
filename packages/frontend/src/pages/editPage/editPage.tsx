import { useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import PostContext from '../../context/Post'
import { Params } from '../../constants'

import BasicPage from '../basicPage/basicPage'
import WritingField from '../../components/writingField'
import MyButton, { MyButtonType } from '../../components/myButton'
import CustomGap from '../../components/customGap'
import AlertCover from '../../components/alertCover'
import { DataType } from '../../constants'

const EditPage = () => {
    const { id } = useParams<Params>()
    const postContext = useContext(PostContext)
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
        postContext.editPost(id, title, content, epkNonce)
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
