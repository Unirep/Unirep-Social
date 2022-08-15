import { useState } from 'react'
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
            `![${content.substring(
                start,
                end
            )}](https://paste-image-url-here.jpg|png|svg|gif)` +
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
                    <div className="group basic">
                        <button onClick={() => addStyle(TextStyle.Bold)}>
                            <img
                                src={require('../../public/images/bold.svg')}
                            />
                        </button>
                        <button onClick={() => addStyle(TextStyle.Italic)}>
                            <img
                                src={require('../../public/images/italic.svg')}
                            />
                        </button>
                        <button onClick={() => addStyle(TextStyle.Strike)}>
                            <img
                                src={require('../../public/images/strike.svg')}
                            />
                        </button>
                        <button onClick={() => addStyle(TextStyle.Code)}>
                            <img
                                src={require('../../public/images/codeblock.svg')}
                            />
                        </button>
                        <button onClick={() => addStyle(TextStyle.Quote)}>
                            <img
                                src={require('../../public/images/quote.svg')}
                            />
                        </button>
                        <button onClick={() => addStyle(TextStyle.List)}>
                            <img
                                src={require('../../public/images/bullet.svg')}
                            />
                        </button>
                        <button onClick={insertLink}>
                            <img
                                src={require('../../public/images/link.svg')}
                            />
                        </button>
                        <button onClick={insertImage}>
                            <img src={require('../../public/images/img.svg')} />
                        </button>
                    </div>
                    <div className="group">
                        <button
                            onClick={() =>
                                window.open(
                                    'https://commonmark.org/help/',
                                    '__blank'
                                )
                            }
                        >
                            <img
                                src={require('../../public/images/info_small.svg')}
                            />
                        </button>
                        <button
                            className="button-border"
                            onClick={() => setIsPreview(!isPreview)}
                        >
                            {isPreview ? 'Edit' : 'Preview'}
                        </button>
                    </div>
                </div>
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
                {!isPreview && (
                    <textarea
                        id="inputTextArea"
                        onChange={handleContentInput}
                        value={content ?? ''}
                        autoFocus={autoFocus}
                    />
                )}
            </div>
        </div>
    )
}

export default TextEditor
