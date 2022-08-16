import { useState, useContext } from 'react'

import UserContext from '../../context/User'

const PrivateKey = () => {
    const [isRevealed, setRevealed] = useState<boolean>(false)
    const user = useContext(UserContext)

    const download = () => {
        if (user.identity) {
            const element = document.createElement('a')
            const file = new Blob([user.identity], { type: 'text/plain' })
            element.href = URL.createObjectURL(file)
            element.download = 'unirep-social-identity.txt'
            document.body.appendChild(element)
            element.click()
        }
    }

    const copy = () => {
        if (user.identity) {
            navigator.clipboard.writeText(user.identity)
        }
    }

    return (
        <div className="private-key">
            <img src={require('../../../public/images/glasses.svg')} />
            <h3>My private key</h3>
            {isRevealed && user !== null ? (
                <div>
                    <div className="private-key-text">{user.identity}</div>
                    <div className="private-key-btns">
                        <div
                            className="private-key-btn black"
                            onClick={download}
                        >
                            Download
                        </div>
                        <div className="private-key-btn black" onClick={copy}>
                            Copy
                        </div>
                    </div>
                </div>
            ) : (
                <div>
                    <p>
                        UniRep Social uses Semaphore technology to generate the
                        private key. It's a super dope string and it's very
                        important for you to store it safely. This key will be
                        used to regain access to your rep points.
                    </p>
                    <div
                        className="private-key-btn"
                        onClick={() => setRevealed(true)}
                    >
                        Reveal my private key
                    </div>
                </div>
            )}
        </div>
    )
}

export default PrivateKey
