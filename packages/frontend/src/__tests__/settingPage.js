import { screen, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingPage from '../pages/settingPage/settingPage'

const mockHistoryPush = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({
        push: mockHistoryPush,
    }),
    useLocation: () => ({
        pathname: "/setting",
        state: {
            test: {
                test: "test",
            }
        }
    })
}));

// mock JSON.parse in jest

  

test('should render SettingPage properly', () => {
    render(
        <SettingPage />
    )
    screen.debug()
});