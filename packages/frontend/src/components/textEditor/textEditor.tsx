import { useState, useEffect } from 'react'
import MarkdownIt from 'markdown-it'
import { NodeHtmlMarkdown } from 'node-html-markdown'

type Props = {
    content: string
    setContent: (value: string) => void
    autoFocus?: boolean
}

enum TextStyle {
    Bold,
    Italic,
    Strike,
    Code,
    Quote,
    List,
}

const markdown = new MarkdownIt({
    breaks: true,
    html: false,
    linkify: true,
})

const TextEditor = ({ content, setContent, autoFocus }: Props) => {
    const [isPreview, setIsPreview] = useState<boolean>(false)
    const [contentHtml, setContentHtml] = useState<string>(
        markdown.render(content)
    )

    const handleDivContentInput = (event: any) => {
        const text = (event.target as HTMLElement).innerHTML
        const mdText = NodeHtmlMarkdown.translate(text)
        setContent(mdText)
    }

    const handleContentInput = (event: any) => {
        setContent(event.target.value)
        setContentHtml(markdown.render(event.target.value))
    }

    const addListItem = (
        previousText: string,
        text: string,
        start: number,
        end: number
    ): string => {
        const listIndex = text.indexOf('\n')

        if (end === 0) {
            return previousText + text
        }
        if (listIndex === -1 || listIndex > end) {
            return previousText + '* ' + text
        }
        if (listIndex < start) {
            return addListItem(
                previousText + text.substring(0, listIndex + 1),
                text.substring(listIndex + 1),
                Math.max(start - listIndex - 1, 0),
                Math.max(end - listIndex - 1, 0)
            )
        }
        return addListItem(
            previousText + '* ' + text.substring(0, listIndex + 1),
            text.substring(listIndex + 1),
            Math.max(start - listIndex - 1, 0),
            Math.max(end - listIndex - 1, 0)
        )
    }

    const addStyle = (style: TextStyle) => {
        const cursorPos = document.getSelection()?.getRangeAt(0).startContainer
        console.log(cursorPos)

        const sel = document.getElementById(
            'inputTextArea'
        ) as HTMLTextAreaElement
        const start = sel.selectionStart
        const end = sel.selectionEnd

        let newContent: string = content
        if (style === TextStyle.Italic) {
            newContent =
                content.substring(0, start) +
                '*' +
                content.substring(start, end) +
                '*' +
                content.substring(end)
        } else if (style === TextStyle.Bold) {
            newContent =
                content.substring(0, start) +
                '**' +
                content.substring(start, end) +
                '**' +
                content.substring(end)
        } else if (style === TextStyle.Strike) {
            newContent =
                content.substring(0, start) +
                '~~' +
                content.substring(start, end) +
                '~~' +
                content.substring(end)
        } else if (style === TextStyle.Code) {
            newContent =
                content.substring(0, start) +
                '`' +
                content.substring(start, end) +
                '`' +
                content.substring(end)
        } else if (style === TextStyle.Quote) {
            newContent =
                content.substring(0, start) +
                '> ' +
                content.substring(start, end) +
                '\n' +
                content.substring(end)
        } else if (style === TextStyle.List) {
            newContent = addListItem('', content, start, end)
        }
        setContent(newContent)
    }

    const insertImage = () => {
        const urlComponent = document.getElementById(
            'insert-image-url'
        ) as HTMLInputElement
        const url = urlComponent.value
        const sel = document.getElementById(
            'inputTextArea'
        ) as HTMLTextAreaElement
        const cursor = sel.selectionStart
        const newContent =
            content.substring(0, cursor) +
            `![](${url})` +
            content.substring(cursor)
        setContent(newContent)
        urlComponent.value = ''
    }

    const insertLink = () => {
        const urlComponent = document.getElementById(
            'insert-url'
        ) as HTMLInputElement
        const url = urlComponent.value
        const sel = document.getElementById(
            'inputTextArea'
        ) as HTMLTextAreaElement
        const start = sel.selectionStart
        const end = sel.selectionEnd
        const newContent =
            content.substring(0, start) +
            `[${content.substring(start, end)}](${url})` +
            content.substring(end)
        setContent(newContent)
        urlComponent.value = ''
    }

    return (
        <div>
            <div>
                <div className="buttons">
                    <button onClick={() => addStyle(TextStyle.Bold)}>B</button>
                    <button onClick={() => addStyle(TextStyle.Italic)}>
                        I
                    </button>
                    <button onClick={() => addStyle(TextStyle.Strike)}>
                        S
                    </button>
                    <button onClick={() => addStyle(TextStyle.Code)}>
                        Code
                    </button>
                    <button onClick={() => addStyle(TextStyle.Quote)}>
                        Quote
                    </button>
                    <button onClick={() => addStyle(TextStyle.List)}>
                        List
                    </button>
                    <label className="insertion">
                        <input
                            id="insert-url"
                            type="text"
                            placeholder="paste your url here"
                        />
                        <button onClick={insertLink}>Insert Link</button>
                    </label>
                    <label className="insertion">
                        <input
                            id="insert-image-url"
                            type="text"
                            placeholder="paste your image url here"
                        />
                        <button onClick={insertImage}>Insert Image</button>
                    </label>
                </div>
                {autoFocus ? (
                    <textarea
                        id="myTextArea"
                        onChange={handleContentInput}
                        value={content ?? ''}
                        autoFocus
                    />
                ) : (
                    <textarea
                        id="inputTextArea"
                        onChange={handleContentInput}
                        value={content ?? ''}
                    />
                )}
            </div>
            <label className="switch">
                <input
                    type="checkbox"
                    checked={isPreview}
                    onClick={() => setIsPreview(!isPreview)}
                />
                <span className="slider round"></span>
                Show Preview
            </label>
            {isPreview && (
                <div className="block-content preview-box">
                    <div className="content">
                        <div
                            dangerouslySetInnerHTML={{
                                __html: contentHtml,
                            }}
                        />
                    </div>
                </div>
            )}
            <div
                contentEditable="true"
                dangerouslySetInnerHTML={{
                    __html: contentHtml,
                }}
                onInput={handleDivContentInput}
            />
        </div>
    )
}

export default TextEditor
