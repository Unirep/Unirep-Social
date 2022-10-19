import { useState, useContext } from 'react'

import UIContext from '../../context/UI'
import UserContext from '../../context/User'
import MyButton, { MyButtonType } from '../../components/myButton'
import CustomInput from '../../components/customInput'
import CustomGap from '../../components/customGap'

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

            uiContext.setDownloadPrivateKey(true)
        }
    }

    const handleEncryptionRadio = (event: any) => {
        if (event.target.value === 'true') setChooseEncryption(true)
        else setChooseEncryption(false)
    }

    return (
        <div className="setting-content">
            {isRevealed ? (
                <div className="reveal-private-key">
                    <MyButton
                        type={MyButtonType.darkTrans}
                        onClick={() => setRevealed(false)}
                    >
                        Hide
                    </MyButton>
                    <CustomGap times={2} />
                    <p>{userContext.identity}</p>
                    <div className="dividing-line"></div>
                    <div className="encrypt-choice">
                        <input
                            type="radio"
                            checked={chooseEncryption}
                            value="true"
                            onChange={handleEncryptionRadio}
                        />
                        <span>Add an encryption</span>
                    </div>
                    {chooseEncryption && (
                        <div className="encryption">
                            <p>
                                Keep in mind, this password is{' '}
                                <strong>NOT</strong> recoverable. If you lost it
                                one day, we won’t be able to help you.
                            </p>
                            <CustomInput
                                id="passwordInput"
                                title="Password"
                                onChange={onPwdChange}
                            />
                            <CustomGap times={1} />
                            <CustomInput
                                id="passwordConfirmInput"
                                title="Confirm password"
                                onChange={onConfirmPwdChange}
                            />
                            <CustomGap times={1} />

                            <div className="error-msg">{errorMsg}</div>
                        </div>
                    )}
                    <div className="encrypt-choice">
                        <input
                            type="radio"
                            checked={!chooseEncryption}
                            value="false"
                            onChange={handleEncryptionRadio}
                        />
                        <span>Download without encryption</span>
                    </div>
                    <MyButton
                        type={MyButtonType.dark}
                        onClick={onClickDownload}
                        fullSize={true}
                        textAlignMiddle={true}
                    >
                        Download
                    </MyButton>
                </div>
            ) : (
                <div>
                    <img
                        src={require('../../../public/images/reveal-key.svg')}
                    />
                    {!uiContext.hasDownloadPrivateKey && (
                        <p>
                            It seems like you haven’t download your private key
                            yet, please do so soon.
                        </p>
                    )}
                    <CustomGap times={2} />
                    <MyButton
                        type={MyButtonType.dark}
                        onClick={() => setRevealed(true)}
                        fullSize={true}
                        textAlignMiddle={true}
                    >
                        Reveal My Private Key
                    </MyButton>
                </div>
            )}
        </div>
    )
}

export default PrivateKey
