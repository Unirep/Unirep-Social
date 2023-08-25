import { screen, render, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PrivateKey from '../pages/settingPage/privateKey'

import UserContext from '../context/User'

global.URL.createObjectURL = jest.fn()

const renderPrivateKeyComponent = (userData) => {
    render(
        <UserContext.Provider value={userData}>
            <PrivateKey />
        </UserContext.Provider>
    )
}

test('should render PrivateKey component', async () => {
    const userData = {
        identity: 'user identity',
        encrypt: jest.fn(),
    }
    renderPrivateKeyComponent(userData)
    const revealKeyButton = screen.getByText('Reveal My Private Key')
    // clicking reveal rerenders page
    await act(async () => revealKeyButton.click())
    // confirm rerender with text queries
    expect(screen.getByText(/Keep in mind, this password is/i))
    expect(screen.getByText(/NOT/i))
    expect(screen.getByText(/recoverable. If you lost it/i))
    // download button testing
    const downloadButton = screen.getByText('Download')
    // click should generate errorMessage (no password typed)
    await act(async () => downloadButton.click())

    expect(
        screen.getByText(
            /you must complete the password field to set up encryption/i
        )
    )
    // now complete password
    const password = screen.getByLabelText('Password')
    const confirmPassword = screen.getByLabelText('Confirm password')
    //TODO: to be fixed
    // await userEvent.type(password, 'satoshispassword')
    // await userEvent.type(confirmPassword, 'satoshispassword')
    // // download key
    // await downloadButton.click()
    // // make sure createObjectURL function was
    // expect(global.URL.createObjectURL).toHaveBeenCalled()
})
