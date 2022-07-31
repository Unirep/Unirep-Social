import { useState, useEffect } from 'react'
import Button from '../Button'
import MarkdownIt from 'markdown-it'

type Props = {
    content: string
    setContent: (value: string) => void
    autoFocus?: boolean
}

const markdown = new MarkdownIt({
    breaks: true,
    html: false,
    linkify: true,
})

const TextEditor = ({ content, setContent, autoFocus }: Props) => {
    const [isPreview, setIsPreview] = useState<boolean>(false)
    const [contentHtml, setContentHtml] = useState<string>('')

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <Button
                    style={{ marginBottom: '4px' }}
                    onClick={() => {
                        setContentHtml(markdown.render(content))
                        setIsPreview(!isPreview)
                    }}
                >
                    {isPreview ? 'Edit' : 'Preview'}
                </Button>
                <div style={{ flex: 1 }} />
                <div
                    style={{ textDecoration: 'underline', cursor: 'pointer' }}
                    onClick={() =>
                        window.open('https://commonmark.org/help/', '__blank')
                    }
                >
                    Markdown Supported
                </div>
            </div>
            {isPreview ? (
                <div className="block-content preview-box">
                    <div className="content">
                        <div
                            dangerouslySetInnerHTML={{
                                __html: contentHtml,
                            }}
                        />
                    </div>
                </div>
            ) : (
                <textarea
                    onChange={(e) => setContent(e.target.value)}
                    value={content}
                    autoFocus={autoFocus}
                />
            )}
        </>
    )
}

export default TextEditor
