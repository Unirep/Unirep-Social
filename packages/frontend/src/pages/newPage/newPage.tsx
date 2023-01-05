import { useContext } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import UserContext from '../../context/User'
import PostContext from '../../context/Post'

import WritingField from '../../components/writingField'
import BasicPage from '../basicPage/basicPage'
import { DataType, Topics } from '../../constants'

const NewPage = () => {
    const history = useHistory()
    const userContext = useContext(UserContext)
    const postContext = useContext(PostContext)

    const location = useLocation<{ topic: string }>() // Use the useLocation hook to get the location object
    const topic = location.state.topic // Access the topic state from the location.state

    const preventPropagation = (event: any) => {
        event.stopPropagation()
    }

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
        <BasicPage title={'Create Post'}>
            <WritingField
                type={DataType.Post}
                submit={submit}
                submitBtnName="Post - 5 points"
                onClick={preventPropagation}
                showDetail={true}
                showTopic={true}
                topicProp={topic}
            />
        </BasicPage>
    )
}

export default observer(NewPage)
