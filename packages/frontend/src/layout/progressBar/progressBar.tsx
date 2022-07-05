import { useContext, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { EXPLORER_URL } from '../../config'

import UserContext from '../../context/User'
import PostContext from '../../context/Post'
import QueueContext, { LoadingState, ActionType } from '../../context/Queue'

const ProgressBar = () => {
    const userContext = useContext(UserContext)
    const postContext = useContext(PostContext)
    const queueContext = useContext(QueueContext)
    const history = useHistory()

    const [isListOpen, setIsListOpen] = useState<boolean>(false)

    return (
        <div className="progress-block">
            {queueContext.loadingState === LoadingState.loading ? (
                <div className="progress-bar-container">
                    <div className="progress-bar">
                        <div
                            className="progress-bar-fill"
                            style={{
                                backgroundImage: `url(${require('../../../public/images/progress-bg.png')})`,
                                width: `${userContext.syncPercent}%`,
                            }}
                        />
                    </div>
                    <div className="progress-bar-text">
                        <img
                            src={require('../../../public/images/glasses-white.svg')}
                        />
                        {Math.floor(userContext.syncPercent)}%
                    </div>
                </div>
            ) : null}
            {queueContext.loadingState === LoadingState.loading ? (
                <div
                    className="progress-info"
                    onClick={() => setIsListOpen(!isListOpen)}
                >
                    <div>
                        <h4>{queueContext.status.title}</h4>
                        <p>{queueContext.status.details}</p>
                    </div>
                    <h4>
                        Detail{' '}
                        <img
                            src={require(`../../../public/images/arrow-${
                                isListOpen ? 'up' : 'down'
                            }-s-fill.svg`)}
                        />
                    </h4>
                </div>
            ) : (
                <div
                    className="progress-info"
                    onClick={() => setIsListOpen(!isListOpen)}
                >
                    <h4>All done.</h4>
                    <h4>
                        Detail{' '}
                        <img
                            src={require(`../../../public/images/arrow-${
                                isListOpen ? 'up' : 'down'
                            }-s-fill.svg`)}
                        />
                    </h4>
                </div>
            )}
            {isListOpen ? (
                <div className="progress-list">
                    {queueContext.histories.map((h) => (
                        <div className="list-item" key={h.opId}>
                            <p>
                                <img
                                    src={require(`../../../public/images/${
                                        h.isSuccess
                                            ? 'check-circle'
                                            : 'emotion-sad-fill'
                                    }.svg`)}
                                />
                                {h.type}
                            </p>
                            {h.isSuccess && h.metadata && (
                                <a
                                    className="etherscan"
                                    target="_blank"
                                    href={`${EXPLORER_URL}/tx/${h.metadata.transactionId}`}
                                >
                                    <span>Etherscan</span>
                                    <img
                                        src={require('../../../public/images/etherscan-white.svg')}
                                    />
                                </a>
                            )}
                            {!h.isSuccess && h.type === ActionType.Post && (
                                <a
                                    className="etherscan"
                                    onClick={() => {
                                        history.push('/new', {
                                            isConfirmed: true,
                                        })
                                    }}
                                >
                                    see my post
                                </a>
                            )}
                            {!h.isSuccess &&
                                h.type === ActionType.Comment &&
                                h.metadata && (
                                    <a
                                        className="etherscan"
                                        href={`/post/${h.metadata.id}`} // if vote on comments, now is not going to the right page
                                    >
                                        go to post
                                    </a>
                                )}
                            {!h.isSuccess &&
                                h.type === ActionType.Vote &&
                                h.metadata &&
                                h.metadata.id && (
                                    <a
                                        className="etherscan"
                                        href={
                                            postContext.postsById[h.metadata.id]
                                                ? `/post/${h.metadata.id}`
                                                : postContext.commentsById[
                                                      h.metadata.id
                                                  ]
                                                ? `/post/${
                                                      postContext.commentsById[
                                                          h.metadata.id
                                                      ].post_id
                                                  }#${h.metadata.id}`
                                                : ''
                                        }
                                    >
                                        go to post
                                    </a>
                                )}
                        </div>
                    ))}
                    {queueContext.activeOp ? (
                        <div className="list-item">
                            <p>
                                <img
                                    src={require(`../../../public/images/progress-bg.png`)}
                                />
                                {queueContext.activeOp.type}
                            </p>
                            <p>Loading...</p>
                        </div>
                    ) : null}

                    {queueContext.operations.map((op) => (
                        <div className="list-item" key={op.id}>
                            <p>
                                <img
                                    src={require(`../../../public/images/progress-bg.png`)}
                                />
                                {op.type}
                            </p>
                            <p
                                className="cancel"
                                onClick={() => queueContext.removeOp(op)}
                            >
                                Cancel
                            </p>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    )
}

export default observer(ProgressBar)
