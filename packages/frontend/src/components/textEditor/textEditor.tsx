import { useState } from 'react'
import MarkdownIt from 'markdown-it'

type Props = {
    content?: string
    setContent: (value: string) => void
    autoFocus?: boolean
}

enum TextStyle {
    Bold,
    Italic,
    Highlight,
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
    const contentHtml = markdown.render(content ?? '')

    const handleContentInput = (event: any) => {
        setContent(event.target.value)
    }

    const addListItem = (
        previousText: string,
        text: string,
        start: number,
        end: number
    ): string => {
        const listIndex = text.indexOf('\n')
        console.log(
            'start: ' + start,
            'end: ' + end,
            'listIndex: ' + listIndex,
            'previousText: ' + previousText,
            'text: ' + text
        )
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
        const sel = document.getElementById('myTextArea') as HTMLTextAreaElement
        const start = sel.selectionStart
        const end = sel.selectionEnd

        console.log('selection start from ', start, ' to ', end)

        if (content) {
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
            } else if (style === TextStyle.Highlight) {
                if (
                    content[start - 1] === ' ' &&
                    content[start - 2] === '#' &&
                    content[end] === ' ' &&
                    content[end + 1] === '#'
                ) {
                    newContent =
                        content.substring(0, start - 1) +
                        '#' +
                        content.substring(start - 1, end + 1) +
                        '#' +
                        content.substring(end + 1)
                } else {
                    newContent =
                        content.substring(0, start) +
                        '# ' +
                        content.substring(start, end) +
                        ' #' +
                        content.substring(end)
                }
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
    }

    const insertImage = () => {
        const urlComponent = document.getElementById(
            'insert-image-url'
        ) as HTMLInputElement
        const url = urlComponent.value
        if (content) {
            const sel = document.getElementById(
                'myTextArea'
            ) as HTMLTextAreaElement
            const cursor = sel.selectionStart
            const newContent =
                content.substring(0, cursor) +
                `![](${url})` +
                content.substring(cursor)
            setContent(newContent)
            urlComponent.value = ''
        }
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
                    <button onClick={() => addStyle(TextStyle.Highlight)}>
                        H
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
                    <label className="insert-image">
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
                        id="myTextArea"
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
        </div>
    )
}

export default TextEditor
