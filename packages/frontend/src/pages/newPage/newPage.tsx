import { useContext } from 'react'
import { useHistory, Redirect, useParams } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import UserContext from '../../context/User'
import PostContext from '../../context/Post'

import WritingField from '../../components/writingField'
import BasicPage from '../basicPage/basicPage'
import { DataType } from '../../constants'

import { topics } from '../../components/topicsMenu'

const NewPage = () => {
    const history = useHistory()
    const userContext = useContext(UserContext)
    const postContext = useContext(PostContext)

    const preventPropagation = (event: any) => {
        event.stopPropagation()
    }

    const { topicId }: any = useParams()

    const submit = async (
        title: string,
        content: string,
        topic: string,
        epkNonce: number,
        reputation: number
    ) => {
        if (!userContext.userState) {
            throw new Error('Should not be able to create post without login')
        }
        postContext.publishPost(title, content, topic, epkNonce, reputation)
        history.push(`/${topic}`)
    }

    return (
        // Check if the route is 'general/new' or if the topicId is in the topics array
        topicId === 'general' || topics.some((t) => t.id === topicId) ? (
            // If the route is 'general/new' or the topicId is in the topics array, render the new page
            <BasicPage
                title={'Create Post'}
                topic={topicId.charAt(0).toUpperCase() + topicId.slice(1)}
            >
                <WritingField
                    type={DataType.Post}
                    submit={submit}
                    submitBtnName="Post - 5 points"
                    onClick={preventPropagation}
                    showDetail={true}
                />
            </BasicPage>
        ) : (
            // If the route is not 'general' and the topicId is not in the topics array, redirect the user to the '/' route
            <Redirect to="/" />
        )
    )
}

export default observer(NewPage)
