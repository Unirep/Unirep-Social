import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Onboarded from '../pages/startPage/onboarded'

const mockHistoryPush = jest.fn()

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({
        push: mockHistoryPush,
    }),
}))

test('should render component properly', () => {
    const title = '🎉 You’re in!'
    const rep = '30 Rep + 3 personas await you!'
    const p1 =
        'Excellent! One huge difference of UniRep Social is that you don’t have to interact with any wallet, we have come up with this solution to smooth out the experience. If you are interested, you can learn more from our developer document.'
    const p2 = 'Enjoy your journey in UniRep Social!'

    render(<Onboarded />)
    expect(
        screen.getByText(title) &&
            screen.getByText(rep) &&
            screen.getByText(p1) &&
            screen.getByText(p2)
    ).toBeInTheDocument()
})

test('should simulate "Get in" button click', async () => {
    render(<Onboarded />)
    const button = screen.getByText(/get in/i)
    await userEvent.click(button)
    expect(mockHistoryPush.mock.calls.length).toEqual(1)
})
