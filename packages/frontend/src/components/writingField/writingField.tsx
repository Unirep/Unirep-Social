import { useState, useContext, useEffect } from 'react'
import 'react-circular-progressbar/dist/styles.css'
import { observer } from 'mobx-react-lite'

import UnirepContext from '../../context/Unirep'
import UserContext from '../../context/User'
import PostContext from '../../context/Post'

import HelpWidget from '../helpWidget/helpWidget'
import { DataType, InfoType } from '../../constants'
import { shortenEpochKey } from '../../utils'

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
    const user = useContext(UserContext)
    const postContext = useContext(PostContext)

    const [title, setTitle] = useState<string>('')
    const [content, setContent] = useState<string>('')
    const [epkNonce, setEpkNonce] = useState<number>(0)
    const [errorMsg, setErrorMsg] = useState<string>('')

    const defaultRep =
        props.type === DataType.Post
            ? unirepConfig.postReputation
            : unirepConfig.commentReputation
    const [reputation, setReputation] = useState(defaultRep)

    useEffect(() => {
        if (props.type === DataType.Post && postContext.postDraft) {
            setTitle(postContext.postDraft.title)
            setContent(postContext.postDraft.content)
        } else if (
            props.type === DataType.Comment &&
            postContext.commentDraft
        ) {
            setContent(postContext.commentDraft.content)
        }
    }, [])

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

    const handleContentInput = (event: any) => {
        setContent(event.target.value)
        postContext.setDraft(props.type, title, event.target.value)
    }

    const handleRepInput = (event: any) => {
        setReputation(+event.target.value)
    }

    const submit = () => {
        if (!user.userState) {
            setErrorMsg('Please sign up or sign in')
        } else {
            if (title.length === 0 && content.length === 0) {
                setErrorMsg('Please input either title or content.')
            } else {
                props.submit(title, content, epkNonce, reputation)
            }
        }
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
                <textarea onChange={handleContentInput} value={content} />
            ) : (
                <textarea
                    autoFocus
                    onChange={handleContentInput}
                    value={content}
                />
            )}
            <div className="info-row">
                <div className="element">
                    <div className="name">
                        Post as <HelpWidget type={InfoType.epk4Post} />
                    </div>
                    <div className="epks">
                        {!user.userState ? (
                            <div>somethings wrong...</div>
                        ) : (
                            user.currentEpochKeys.map((epk, i) => (
                                <div
                                    className={
                                        i === epkNonce ? 'epk chosen' : 'epk'
                                    }
                                    onClick={() => setEpkNonce(i)}
                                    key={epk}
                                >
                                    {shortenEpochKey(epk)}
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div className="element">
                    <div className="name">
                        My Rep display <HelpWidget type={InfoType.rep} />
                    </div>
                    <div className="rep-chooser">
                        <input
                            type="range"
                            min={defaultRep}
                            max={
                                user.userState ? user.netReputation : defaultRep
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
