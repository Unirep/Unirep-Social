import { useEffect, useState } from 'react'
import MarkdownIt from 'markdown-it'

type Props = {
    content?: string
    setContent: (value: string) => void
}

enum TextStyle {
    Bold,
    Italic,
    Highlight,
    List
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

    const addListItem = (previousText: string, text: string, start: number, end: number) : string => {
        const listIndex = text.indexOf('\n')
        console.log('start: ' + start, 'end: ' + end, 'listIndex: ' + listIndex, 'previousText: ' + previousText, 'text: ' + text)
        if (end === 0) {
            return previousText + text
        }
        if (listIndex === -1 || listIndex > end) {
            return previousText + '* ' + text
        } 
        if (listIndex < start) {
            return addListItem(previousText + text.substring(0, listIndex+1), text.substring(listIndex+1), Math.max(start - listIndex - 1, 0), Math.max(end - listIndex - 1, 0))
        }
        return addListItem(previousText + '* ' + text.substring(0, listIndex+1), text.substring(listIndex+1), Math.max(start - listIndex - 1, 0), Math.max(end - listIndex - 1, 0))
    } 

    const addStyle = (style: TextStyle) => {
        const sel = document.getElementById('myTextArea') as HTMLTextAreaElement
        const start = sel.selectionStart
        const end = sel.selectionEnd
        
        console.log('selection start from ', start, ' to ', end)

        if (content) {
            let newContent: string = content
            if (style === TextStyle.Italic) {
                newContent = content.substring(0, start) + '*' + content.substring(start, end) + '*' + content.substring(end)
            } else if (style === TextStyle.Bold) {
                newContent = content.substring(0, start) + '**' + content.substring(start, end) + '**' + content.substring(end)
            } else if (style === TextStyle.Highlight) {
                if (content[start-1] === ' ' && content[start-2] === '#' && content[end] === ' ' && content[end+1] === '#') {
                    newContent = content.substring(0, start-1) + '#' + content.substring(start-1, end+1) + '#' + content.substring(end+1)
                } else {
                    newContent = content.substring(0, start) + '# ' + content.substring(start, end) + ' #' + content.substring(end)
                }
            } else if (style === TextStyle.List) {
                newContent = addListItem('', content, start, end)
            }
            setContent(newContent)
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
                        <button onClick={() => addStyle(TextStyle.Bold)}>B</button>
                        <button onClick={() => addStyle(TextStyle.Italic)}>I</button>
                        <button onClick={() => addStyle(TextStyle.Highlight)}>H</button>
                        <button onClick={() => addStyle(TextStyle.List)}>List</button>
                    </div>
                    <textarea id="myTextArea" onChange={handleContentInput} value={content ?? ''} />
                </div>
            )}
        </div>
    )
}

export default TextEditor
