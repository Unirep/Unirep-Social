import { useState, useContext } from 'react'

import UIContext from '../../context/UI'
import UserContext from '../../context/User'
import MyButton, { ButtonType } from '../../components/myButton'
import CustomInput from '../../components/customInput'

const PrivateKey = () => {
    const [isRevealed, setRevealed] = useState<boolean>(false)
    const [chooseEncryption, setChooseEncryption] = useState<boolean>(true)
    const [pwd, setPwd] = useState<string>('')
    const [errorMsg, setErrorMsg] = useState<string>('')

    const userContext = useContext(UserContext)
    const uiContext = useContext(UIContext)

    const download = () => {
        if (userContext.identity) {
            const element = document.createElement('a')
            const file = new Blob([userContext.identity], {
                type: 'text/plain',
            })
            element.href = URL.createObjectURL(file)
            element.download = 'unirep-social-identity.txt'
            document.body.appendChild(element)
            element.click()
        }
    }

    const copy = () => {
        if (userContext.identity) {
            navigator.clipboard.writeText(userContext.identity)
        }
    }

    const onPwdChange = (event: any) => {
        setPwd(event.target.value)

        if (event.target.value) setErrorMsg('')
    }

    const onConfirmPwdChange = (event: any) => {
        if (event.target.value !== pwd) {
            setErrorMsg('Confirm password is wrong')
        } else {
            setErrorMsg('')
        }
    }

    const onClickDownload = async () => {
        if (chooseEncryption && pwd.length === 0) {
            setErrorMsg(
                'You must complete the password field to set up encryption'
            )
        } else {
            const element = document.createElement('a')
            let file

            if (pwd && pwd.length > 0) {
                const encrypted = await userContext.encrypt(pwd)
                file = new Blob([JSON.stringify(encrypted)], {
                    type: 'text/plain',
                })
            } else {
                file = new Blob(
                    [userContext.id?.serializeIdentity() as string],
                    { type: 'text/plain' }
                )
            }

            element.href = URL.createObjectURL(file)
            element.download = 'unirep-social-identity.txt'
            document.body.appendChild(element)
            element.click()

            uiContext.setDownloadPrivateKey()
        }
    }

    const handleEncryptionRadio = (event: any) => {
        if (event.target.value === 'true') setChooseEncryption(true)
        else setChooseEncryption(false)
    }

    return (
        <div>
            {isRevealed ? (
                <div className="reveal-private-key">
                    <MyButton
                        type={ButtonType.light}
                        onClick={() => setRevealed(false)}
                    >
                        Hide
                    </MyButton>
                    <p>{userContext.identity}</p>
                    <div className="dividing-line"></div>
                    <div>
                        <input
                            type="radio"
                            checked={chooseEncryption}
                            value="true"
                            onChange={handleEncryptionRadio}
                        />
                        <label>Add an encryption</label>
                    </div>
                    {chooseEncryption && (
                        <div className="encryption">
                            <p>
                                Keep in mind, this password is{' '}
                                <strong>NOT</strong> recoverable. If you lost
                                one day, we won’t be able to help you.
                            </p>
                            <CustomInput
                                id="passwordInput"
                                title="Password"
                                onChange={onPwdChange}
                            />
                            <CustomInput
                                id="passwordConfirmInput"
                                title="Confirm password"
                                onChange={onConfirmPwdChange}
                            />
                            <div className="error-msg">{errorMsg}</div>
                        </div>
                    )}
                    <div>
                        <input
                            type="radio"
                            checked={!chooseEncryption}
                            value="false"
                            onChange={handleEncryptionRadio}
                        />
                        <label>Download without encryption</label>
                    </div>
                    <MyButton type={ButtonType.dark} onClick={onClickDownload}>
                        Download
                    </MyButton>
                </div>
            ) : (
                <div>
                    <img
                        src={require('../../../public/images/reveal-key.svg')}
                    />
                    {!uiContext.downloadPrivateKey && (
                        <p>
                            It seems like you haven’t download your private key
                            yet, please do so soon.
                        </p>
                    )}
                    <MyButton
                        type={ButtonType.dark}
                        onClick={() => setRevealed(true)}
                    >
                        Reveal My Private Key
                    </MyButton>
                </div>
            )}
        </div>
    )
}

export default PrivateKey
