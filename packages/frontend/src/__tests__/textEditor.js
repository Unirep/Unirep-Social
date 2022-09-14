import { screen, render, waitFor } from '@testing-library/react'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import TextEditor from '../components/textEditor'

const loremText =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum'

const TestWrapper = () => {
    const [content, setContent] = useState('')
    return (
        <TextEditor
            content={content}
            setContent={setContent}
            autoFocus={true}
        />
    )
}

const renderTextEditor = () => {
    return render(<TestWrapper />)
}

test('type text into textbox', async () => {
    renderTextEditor()
    const textbox = screen.getByRole('textbox')
    return userEvent
        .type(textbox, loremText)
        .then(() => expect(textbox).toHaveValue(loremText))
})

test('should toggle the Preview and Edit functionality', async () => {
    renderTextEditor('content', jest.fn(), false)
    expect(screen.getByText(/preview/i)).toBeInTheDocument()
    screen.getByText(/preview/i).click()
    expect(screen.queryByText(/preview/i)).not.toBeInTheDocument()
    expect(screen.getByText(/edit/i)).toBeInTheDocument()
})
