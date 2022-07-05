import { useState } from 'react'

type Props = {
    url: string
    closeBox: () => void
}

const ShareBox = ({ url, closeBox }: Props) => {
    const [isCopied, setCopied] = useState<boolean>(false)

    const copyURL = () => {
        if (!isCopied) {
            navigator.clipboard.writeText(url)
            setCopied(true)
        }
    }

    const preventClose = (event: any) => {
        event.stopPropagation()
    }

    const close = (event: any) => {
        preventClose(event)
        closeBox()
    }

    return (
        <div className="share-overlay" onClick={close}>
            <div className="share-box" onClick={preventClose}>
                <div className="close">
                    <img
                        src={require('../../../public/images/close-white.svg')}
                        onClick={close}
                    />
                </div>
                <div className="title">
                    <img src={require(`../../../public/images/share.svg`)} />
                    Share This Post
                </div>
                <div className="url-sharing">
                    <div className="url">{url}</div>
                    <div
                        className={isCopied ? 'copy-btn isCopied' : 'copy-btn'}
                        onClick={copyURL}
                    >
                        {isCopied ? 'Link Copied' : 'Copy Link'}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ShareBox
