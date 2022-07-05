import { useEffect, useContext } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import UserContext from '../../context/User'
import PostContext from '../../context/Post'
import WritingField from '../../components/writingField/writingField'
import BasicPage from '../basicPage/basicPage'
import { DataType } from '../../constants'

const NewPage = () => {
    const history = useHistory()
    const location = useLocation<Location>()
    const state = JSON.parse(JSON.stringify(location.state))
    const isConfirmed = state.isConfirmed
    const userContext = useContext(UserContext)
    const postContext = useContext(PostContext)

    useEffect(() => {
        console.log('Is this new page being confirmd? ' + isConfirmed)
    }, [])

    const preventPropagation = (event: any) => {
        event.stopPropagation()
    }

    const submit = async (
        title: string,
        content: string,
        epkNonce: number,
        reputation: number
    ) => {
        if (!userContext.userState) {
            throw new Error('Should not be able to create post without login')
        }
        postContext.publishPost(title, content, epkNonce, reputation)
        history.push('/')
    }

    return (
        <BasicPage>
            <h3>Create post</h3>
            <WritingField
                type={DataType.Post}
                submit={submit}
                submitBtnName="Post - 5 points"
                onClick={preventPropagation}
            />
        </BasicPage>
    )
}

export default observer(NewPage)
