import { useState } from 'react'
import useWindowDimension from '../../hooks/useWindowDimensions'
import { QueryType } from '../../constants'

type choiceProps = {
    type: QueryType
    isChosen: boolean
    setFeedChoice: (query: QueryType) => void
}

const FeedChoice = ({ type, isChosen, setFeedChoice }: choiceProps) => {
    return (
        <div
            className={isChosen ? 'feed-choice chosen' : 'feed-choice'}
            onClick={() => setFeedChoice(type)}
        >
            <img
                src={require(`../../../public/images/${type}${
                    isChosen ? '-fill' : ''
                }.svg`)}
            />
            <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
        </div>
    )
}

type Props = {
    feedChoice: QueryType
    setFeedChoice: (query: QueryType) => void
}

const Feed = ({ feedChoice, setFeedChoice }: Props) => {
    const { width } = useWindowDimension()
    const [isDropdown, setDropdown] = useState<boolean>(false)

    const setChoice = (query: QueryType) => {
        setFeedChoice(query)
        setDropdown(false)
    }

    if (width !== null && width <= 600) {
        return (
            <div className="feed-row">
                {isDropdown ? (
                    <div>
                        <FeedChoice
                            type={QueryType.New}
                            isChosen={feedChoice === QueryType.New}
                            setFeedChoice={setChoice}
                        />
                        <FeedChoice
                            type={QueryType.Boost}
                            isChosen={feedChoice === QueryType.Boost}
                            setFeedChoice={setChoice}
                        />
                        <FeedChoice
                            type={QueryType.Comments}
                            isChosen={feedChoice === QueryType.Comments}
                            setFeedChoice={setChoice}
                        />
                        <FeedChoice
                            type={QueryType.Squash}
                            isChosen={feedChoice === QueryType.Squash}
                            setFeedChoice={setChoice}
                        />
                    </div>
                ) : (
                    <FeedChoice
                        type={feedChoice}
                        isChosen={true}
                        setFeedChoice={() => setDropdown(true)}
                    />
                )}
            </div>
        )
    } else {
        return (
            <div className="feed-row">
                <FeedChoice
                    type={QueryType.New}
                    isChosen={feedChoice === QueryType.New}
                    setFeedChoice={setFeedChoice}
                />
                <div className="divider"></div>
                <FeedChoice
                    type={QueryType.Boost}
                    isChosen={feedChoice === QueryType.Boost}
                    setFeedChoice={setFeedChoice}
                />
                <div className="divider"></div>
                <FeedChoice
                    type={QueryType.Comments}
                    isChosen={feedChoice === QueryType.Comments}
                    setFeedChoice={setFeedChoice}
                />
                <div className="divider"></div>
                <FeedChoice
                    type={QueryType.Squash}
                    isChosen={feedChoice === QueryType.Squash}
                    setFeedChoice={setFeedChoice}
                />
            </div>
        )
    }
}

export default Feed
