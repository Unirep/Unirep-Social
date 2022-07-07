import { useState } from 'react'
import MarkdownIt from 'markdown-it'

type Props = {
    content?: string
    setContent: (value: string) => void
}

const markdown = new MarkdownIt({
    breaks: true,
    html: false,
    linkify: true,
})

const TextEditor = ({ content, setContent }: Props) => {
    const [isPreview, setIsPreview] = useState<boolean>(false)
    const contentHtml = markdown.render(content ?? '')

    const handleContentInput = (event: any) => {
        setContent(event.target.value)
    }

    return (
        <div>
            <button onClick={() => setIsPreview(!isPreview)}>preview</button>
            {isPreview ? (
                <div
                dangerouslySetInnerHTML={{
                    __html: contentHtml,
                }}
            />
            ) : (
                <textarea onChange={handleContentInput} value={content ?? ''} />
            )}
        </div>
    )
}

export default TextEditor
