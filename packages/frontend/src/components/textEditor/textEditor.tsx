import { useEffect, useState } from 'react'
import MarkdownIt from 'markdown-it'

type Props = {
    content?: string
    setContent: (value: string) => void
}

enum TextStyle {
    Bold,
    Italic
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

    const addStyle = (style: TextStyle) => {
        const sel = document.getElementById('myTextArea') as HTMLTextAreaElement
        const start = sel.selectionStart
        const end = sel.selectionEnd
        console.log('selection start from ', start, ' to ', end)

        if (content) {
            if (style === TextStyle.Italic) {
                const newContent = content.substring(0, start) + '*' + content.substring(start, end) + '*' + content.substring(end)
                setContent(newContent)
            } else if (style === TextStyle.Bold) {
                const newContent = content.substring(0, start) + '**' + content.substring(start, end) + '**' + content.substring(end)
                setContent(newContent)
            }
        }
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
                <div>
                    <div className="buttons">
                        <button onClick={() => addStyle(TextStyle.Bold)}>Bold</button>
                        <button onClick={() => addStyle(TextStyle.Italic)}>Italic</button>
                    </div>
                    <textarea id="myTextArea" onChange={handleContentInput} value={content ?? ''} />
                </div>
            )}
        </div>
    )
}

export default TextEditor
