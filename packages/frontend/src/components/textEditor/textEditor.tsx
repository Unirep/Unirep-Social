import { useState, useEffect } from 'react'
import MarkdownIt from 'markdown-it'

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
        setContentHtml(markdown.render(newContent))
    }

    const insertImage = () => {
        const sel = document.getElementById(
            'inputTextArea'
        ) as HTMLTextAreaElement
        const start = sel.selectionStart
        const end = sel.selectionEnd
        const newContent =
            content.substring(0, start) +
            `![${content.substring(start, end)}](https://paste-image-url-here.jpg|png|svg|gif)` +
            content.substring(end)
        setContent(newContent)
        setContentHtml(markdown.render(newContent))
    }

    const insertLink = () => {
        const sel = document.getElementById(
            'inputTextArea'
        ) as HTMLTextAreaElement
        const start = sel.selectionStart
        const end = sel.selectionEnd
        const newContent =
            content.substring(0, start) +
            `[${content.substring(start, end)}](https://)` +
            content.substring(end)
        setContent(newContent)
        setContentHtml(markdown.render(newContent))
    }

    return (
        <div>
            <div>
                <div className="buttons">
                    <button onClick={() => addStyle(TextStyle.Bold)}><strong>B</strong></button>
                    <button onClick={() => addStyle(TextStyle.Italic)}>
                        <i>I</i>
                    </button>
                    <button onClick={() => addStyle(TextStyle.Strike)}>
                        <s>S</s>
                    </button>
                    <button onClick={() => addStyle(TextStyle.Code)}>
                        {`</>`}
                    </button>
                    <button onClick={() => addStyle(TextStyle.Quote)}>
                        ""
                    </button>
                    <button onClick={() => addStyle(TextStyle.List)}>
                        List
                    </button>
                    <button onClick={insertLink}>Link</button>
                    <button onClick={insertImage}>Image</button>
                    <button onClick={() =>
                        window.open('https://commonmark.org/help/', '__blank')
                    }>
                        More
                    </button>
                </div>
                <textarea
                    id="inputTextArea"
                    onChange={handleContentInput}
                    value={content ?? ''}
                    autoFocus={autoFocus}
                />
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
        </div>
    )
}

export default TextEditor
