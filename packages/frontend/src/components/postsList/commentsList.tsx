import { observer } from 'mobx-react-lite'

import CommentBlock from '../postBlock/commentBlock'
import { Page } from '../../constants'
import { LOAD_POST_COUNT } from '../../config'

type Props = {
    commentIds: string[]
    page: Page
    loadMoreComments: () => void
}

const CommentsList = ({ commentIds, page, loadMoreComments }: Props) => {
    return (
        <div className="post-list">
            {commentIds.length > 0 ? (
                commentIds.map((id, i) => (
                    <div className="post-block" key={id}>
                        <CommentBlock commentId={id} page={page} />
                    </div>
                ))
            ) : (
                <div className="no-posts">
                    <img src={require('../../../public/images/glasses.svg')} />
                    <p>
                        It's empty here.
                        <br />
                        People just being shy, no post yet.
                    </p>
                </div>
            )}
            {commentIds.length > 0 &&
            commentIds.length % LOAD_POST_COUNT === 0 ? (
                <div className="load-more-button" onClick={loadMoreComments}>
                    Load more posts
                </div>
            ) : (
                <div></div>
            )}
        </div>
    )
}

export default observer(CommentsList)
