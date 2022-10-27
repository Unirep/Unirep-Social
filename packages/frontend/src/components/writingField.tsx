import { useState, useContext, useEffect } from 'react'
import 'react-circular-progressbar/dist/styles.css'
import { observer } from 'mobx-react-lite'

import UnirepContext from '../context/Unirep'
import UserContext from '../context/User'
import PostContext from '../context/Post'
import EpochContext from '../context/EpochManager'

import TextEditor from './textEditor'
import ActionDetail from './actionDetail'
import { DataType } from '../constants'

type Props = {
    type: DataType
    submit: (
        title: string,
        content: string,
        epkNonce: number,
        reputation: number
    ) => void
    submitBtnName: string
    onClick: (event: any) => void
}

const WritingField = (props: Props) => {
    const unirepConfig = useContext(UnirepContext)
    const userContext = useContext(UserContext)
    const postContext = useContext(PostContext)
    const epochManager = useContext(EpochContext)
    const [useSubsidy, setUseSubsidy] = useState<boolean>(true)

    const [title, setTitle] = useState<string>(() => {
        if (props.type === DataType.Post && postContext.postDraft) {
            return postContext.postDraft.title
        }
        return ''
    })
    const [content, setContent] = useState<string>(() => {
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

    const defaultRep =
        props.type === DataType.Post
            ? unirepConfig.postReputation
            : unirepConfig.commentReputation
    const [reputation, setReputation] = useState(0)

    useEffect(() => {
        setErrorMsg('')
    }, [title, content, reputation, epkNonce])

    const onClickField = (event: any) => {
        props.onClick(event)
    }

    const handleTitleInput = (event: any) => {
        setTitle(event.target.value)
        postContext.setDraft(props.type, event.target.value, content)
    }

    const handleTextEditorInput = (text: string) => {
        setContent(text)
        postContext.setDraft(props.type, title, text)
    }

    const submit = () => {
        if (!userContext.userState) {
            setErrorMsg('Please sign up or sign in')
        } else {
            if (title.length === 0 && content.length === 0) {
                setErrorMsg('Please input either title or content.')
            } else {
                props.submit(title, content, epkNonce, reputation)
            }
        }
    }

    const chooseToUseSubsidy = () => {
        setUseSubsidy(true)
        setEpkNonce(-1)
    }

    const chooseToUsePersona = () => {
        setUseSubsidy(false)
        setEpkNonce(0)
        setReputation(defaultRep)
    }

    return (
        <div className="writing-field" onClick={onClickField}>
            {props.type === DataType.Post ? (
                <input
                    type="text"
                    placeholder="Give an eye-catching title"
                    onChange={handleTitleInput}
                    value={title}
                />
            ) : (
                <div></div>
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
            {userContext.userState ? (
                <ActionDetail
                    showBorder={true}
                    showHelp={true}
                    showRep={true}
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
            <div className="submit-btn" onClick={submit}>
                {props.submitBtnName}
            </div>
            {errorMsg.length > 0 ? (
                <div className="error">{errorMsg}</div>
            ) : (
                <div></div>
            )}
            {userContext.userState &&
                (epochManager.readyToTransition || userContext.needsUST) && (
                    <div className="disable-cover"></div>
                )}
        </div>
    )
}

export default observer(WritingField)
