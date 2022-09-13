import { useState, useContext, useEffect } from 'react'
import 'react-circular-progressbar/dist/styles.css'
import { observer } from 'mobx-react-lite'

import UnirepContext from '../context/Unirep'
import UserContext from '../context/User'
import PostContext from '../context/Post'

import HelpWidget from './helpWidget'
import TextEditor from './textEditor'
import { DataType, InfoType } from '../constants'
import { shortenEpochKey } from '../utils'

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

    const handleRepInput = (event: any) => {
        setReputation(+event.target.value)
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
            <div className="info">
                <div className="choose-from">
                    <div className="choices">
                        <strong
                            className={useSubsidy ? 'chosen' : ''}
                            onClick={chooseToUseSubsidy}
                        >
                            Rep-Handout
                        </strong>
                        <strong
                            className={useSubsidy ? '' : 'chosen'}
                            onClick={chooseToUsePersona}
                        >
                            Personas
                        </strong>
                    </div>
                    <div className="help">
                        <HelpWidget type={InfoType.subsidy} />
                    </div>
                </div>
                {!userContext.userState ? (
                    <div className="info-detail">somethings wrong...</div>
                ) : useSubsidy ? (
                    userContext.subsidyReputation > defaultRep ? (
                        <div className="info-detail">
                            <div className="epk chosen">
                                <strong>{userContext.subsidyReputation}</strong>
                                <span className="interline"></span>
                                {userContext.allEpks[0]}
                            </div>
                            <div
                                className="rep-chooser"
                                style={{
                                    display:
                                        userContext.netReputation > defaultRep
                                            ? 'flex'
                                            : 'none',
                                }}
                            >
                                <input
                                    type="range"
                                    min={0}
                                    max={
                                        userContext.userState
                                            ? userContext.netReputation
                                            : defaultRep
                                    }
                                    onChange={handleRepInput}
                                    value={reputation}
                                />
                                <input
                                    type="text"
                                    value={reputation}
                                    onChange={handleRepInput}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="info-detail">
                            Oh well, you have used all the Rep-Handout ;)
                        </div>
                    )
                ) : userContext.netReputation > defaultRep ? (
                    <div className="info-detail">
                        <div className="epks">
                            {userContext.currentEpochKeys.map((epk, i) => (
                                <div
                                    className={
                                        i === epkNonce ? 'epk chosen' : 'epk'
                                    }
                                    onClick={() => setEpkNonce(i)}
                                    key={epk}
                                >
                                    {shortenEpochKey(epk)}
                                </div>
                            ))}
                        </div>
                        <div
                            className="rep-chooser"
                            style={{
                                display:
                                    userContext.netReputation > defaultRep
                                        ? 'flex'
                                        : 'none',
                            }}
                        >
                            <input
                                type="range"
                                min={0}
                                max={
                                    userContext.userState
                                        ? userContext.netReputation
                                        : defaultRep
                                }
                                onChange={handleRepInput}
                                value={reputation}
                            />
                            <input
                                type="text"
                                value={reputation}
                                onChange={handleRepInput}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="info-detail">
                        Sorry, you don’t have any Rep to use persona yet....
                    </div>
                )}
            </div>
            <div className="submit-btn" onClick={submit}>
                {props.submitBtnName}
            </div>
            {errorMsg.length > 0 ? (
                <div className="error">{errorMsg}</div>
            ) : (
                <div></div>
            )}
        </div>
    )
}

export default observer(WritingField)
