import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TextEditor from '../components/textEditor/textEditor'

// todo: having same issue with userEvent.type as i have in loginPage

test.skip('should render TextEditor correctly', async () => {
    const content = 'content prop'
    const setContent = jest.fn()
    const autoFocus = true
    render(
        <TextEditor
            content={content}
            setContent={setContent}
            autoFocus={autoFocus}
        />
    )
})
