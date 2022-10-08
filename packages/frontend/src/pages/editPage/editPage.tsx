import { useContext, useEffect } from 'react'
import { useParams } from 'react-router-dom'

import PostContext from '../../context/Post'
import { Params } from '../../constants'

import BasicPage from '../basicPage/basicPage'
import WritingField from '../../components/writingField'
import MyButton, { ButtonType } from '../../components/myButton'
import CustomGap from '../../components/customGap'
import { DataType } from '../../constants'

const EditPage = () => {
    const { id } = useParams<Params>()
    const postContext = useContext(PostContext)

    useEffect(() => {
        postContext.loadPost(id)
    }, [])

    const preventPropagation = (event: any) => {
        event.stopPropagation()
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
                />
            ) : (
                <div>loading...</div>
            )}
            <CustomGap times={2} />
            {postContext.postsById[id] && (
                <MyButton type={ButtonType.light} fullSize={true}>
                    Delete Post
                </MyButton>
            )}
        </BasicPage>
    )
}

export default EditPage
