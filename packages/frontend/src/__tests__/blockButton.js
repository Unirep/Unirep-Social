import { screen, render, waitFor } from '@testing-library/react'
import UserContext from '../context/User'
import userEvent from '@testing-library/user-event'
import BlockButton from '../components/postBlock/blockButton'

const renderBlockButton = (userData, type, count, data) => {
    return render(
        <UserContext.Provider value={userData}>
            <BlockButton type={type} count={count} data={data} />
        </UserContext.Provider>
    )
}

test('should render BlockButton props correctly with comment button', () => {
    // Mocked props
    const type = 'comment'
    const count = 1
    const data = {
        type: 'comment',
        id: '0x123456789',
        post_id: '0x123456789',
        content: 'test',
        upvote: 0,
        downvote: 0,
        epoch_key: '0x123456789',
        username: 'test',
        post_time: 0,
        reputation: 0,
        current_epoch: 0,
        proofIndex: 0,
    }
    const userData = {
        userState: true,
        currentEpoch: 3,
        netReputation: 30,
    }

    renderBlockButton(userData, type, count, data)
    expect(screen.getByText(count)).toBeInTheDocument()
    expect(screen.getByText(/comment/i)).toBeInTheDocument()
})

test('should render BlockButton share button correctly', async () => {
    // Mocked props
    const type = 'share'
    const count = 100
    const data = {
        type: 'share',
        id: '0x123456789',
        post_id: '0x123456789',
        content: 'test',
        upvote: 0,
        downvote: 0,
        epoch_key: '0x123456789',
        username: 'test',
        post_time: 0,
        reputation: 0,
        current_epoch: 0,
        proofIndex: 0,
    }
    const userData = {
        userState: true,
        currentEpoch: 3,
        netReputation: 30,
    }

    renderBlockButton(userData, type, count, data)
    // count prop should be rendered with type 'share' prop
    expect(screen.queryByText(count)).not.toBeInTheDocument()
    // Check if share button is rendered
    expect(document.getElementsByClassName('block-button-share')).toBeTruthy()
    const blockBtnShare =
        document.getElementsByClassName('block-button-share')[0]
    // this will trigger setIsHover
    await userEvent.click(blockBtnShare)
    await userEvent.hover(blockBtnShare)
    await userEvent.dblClick(blockBtnShare)
})
