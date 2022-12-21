import { useState, useContext, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import 'react-circular-progressbar/dist/styles.css'
import { observer } from 'mobx-react-lite'

import UnirepContext from '../context/Unirep'
import UserContext from '../context/User'
import PostContext from '../context/Post'
import UIContext, { EpochStatus } from '../context/UI'

import TextEditor from './textEditor'
import ActionDetail from './actionDetail'
import MyButton, { MyButtonType } from './myButton'
import { DataType } from '../constants'

type Props = {
    type: DataType
    submit: (
        title: string,
        content: string,
        topic: string,
        epkNonce: number,
        reputation: number
    ) => void
    submitBtnName: string
    onClick: (event: any) => void
    title?: string
    content?: string
    showDetail?: boolean
    isEdit?: boolean
}

const WritingField = (props: Props) => {
    const unirepConfig = useContext(UnirepContext)
    const userContext = useContext(UserContext)
    const postContext = useContext(PostContext)
    const uiContext = useContext(UIContext)

    const location = useLocation<{ topic: string }>()

    const [useSubsidy, setUseSubsidy] = useState<boolean>(true)
    const [title, setTitle] = useState<string>(() => {
        if (props.title) {
            return props.title
        }

        if (props.type === DataType.Post && postContext.postDraft) {
            return postContext.postDraft.title
        }
        return ''
    })
    const [content, setContent] = useState<string>(() => {
        if (props.content) {
            return props.content
        }

        if (props.type === DataType.Post && postContext.postDraft) {
            return postContext.postDraft.content
        } else if (
            props.type === DataType.Comment &&
            postContext.commentDraft
        ) {
            return postContext.commentDraft.content
        }
        return ''
    })
    const [epkNonce, setEpkNonce] = useState<number>(-1)
    const [errorMsg, setErrorMsg] = useState<string>('')

    const [topic, setTopic] = useState<string>('')

    const handleTopic = () => {
        if (
            location.state &&
            location.state.topic &&
            props.type === DataType.Post
        ) {
            setTopic(location.state.topic)
        }
    }

    const defaultRep =
        props.type === DataType.Post
            ? unirepConfig.postReputation
            : unirepConfig.commentReputation
    const [reputation, setReputation] = useState(0)

    useEffect(() => {
        setErrorMsg('')
        handleTopic()
    }, [title, content, reputation, epkNonce])

    const onClickField = (event: any) => {
        props.onClick(event)
    }

    const handleTitleInput = (event: any) => {
        setTitle(event.target.value)
        if (props.isEdit) return
        postContext.setDraft(props.type, event.target.value, content)
    }

    const handleTextEditorInput = (text: string) => {
        setContent(text)
        if (props.isEdit) return
        postContext.setDraft(props.type, title, text)
    }

    const submit = () => {
        if (!userContext.userState) {
            setErrorMsg('Please sign up or sign in')
        } else {
            if (title.length === 0 && content.length === 0) {
                setErrorMsg('Please input either title or content.')
            } else if (
                props.isEdit &&
                title === props.title &&
                content === props.content
            ) {
                setErrorMsg(
                    'Please change your content to update, else click cancel to leave edit mode.'
                )
            } else {
                props.submit(title, content, topic, epkNonce, reputation)
            }
        }
    }

    const chooseToUseSubsidy = () => {
        setUseSubsidy(true)
        setEpkNonce(-1)
        setReputation(0)
    }

    const chooseToUsePersona = () => {
        setUseSubsidy(false)
        setEpkNonce(0)
        if (reputation < defaultRep) {
            setReputation(defaultRep)
        }
    }

    return (
        <div className="writing-field" onClick={onClickField}>
            {props.type === DataType.Post && (
                <input
                    type="text"
                    placeholder="Give an eye-catching title"
                    onChange={handleTitleInput}
                    value={title}
                />
            )}
            {props.type === DataType.Post ? (
                <TextEditor
                    content={content}
                    setContent={handleTextEditorInput}
                />
            ) : (
                <TextEditor
                    content={content}
                    setContent={handleTextEditorInput}
                    autoFocus={true}
                />
            )}
            <div style={{ marginBottom: '32px' }}></div>
            {props.showDetail && (
                <>
                    {userContext.userState ? (
                        <ActionDetail
                            showBorder={true}
                            showHelp={true}
                            showRep={userContext.netReputation > defaultRep}
                            maxRep={userContext.netReputation}
                            defaultRep={defaultRep}
                            hasRep={
                                useSubsidy
                                    ? userContext.subsidyReputation
                                    : userContext.netReputation
                            }
                            showoffRep={reputation}
                            setShowoffRep={setReputation}
                            allEpks={userContext.currentEpochKeys}
                            useSubsidy={useSubsidy}
                            chooseToUseSubsidy={chooseToUseSubsidy}
                            chooseToUsePersona={chooseToUsePersona}
                            epkNonce={epkNonce}
                            setEpkNonce={setEpkNonce}
                        />
                    ) : (
                        <>somethings wrong...</>
                    )}
                </>
            )}
            <MyButton
                type={MyButtonType.dark}
                onClick={submit}
                fullSize={true}
                textAlignMiddle={true}
                fontWeight={600}
            >
                {props.submitBtnName}
            </MyButton>
            {errorMsg.length > 0 && <div className="error">{errorMsg}</div>}
            {uiContext.epochStatus !== EpochStatus.default && (
                <div className="disable-cover"></div>
            )}
        </div>
    )
}

export default observer(WritingField)
