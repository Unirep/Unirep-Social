import { useHistory } from 'react-router-dom'
import { useContext, useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'

import PostContext from '../../context/Post'
import UserContext from '../../context/User'
import { ABOUT_URL } from '../../config'

import LoadingCover from '../../components/loadingCover/loadingCover'
import LoadingButton from '../../components/loadingButton/loadingButton'

const SignupPage = () => {
    const userContext = useContext(UserContext)
    const postContext = useContext(PostContext)
    const history = useHistory()
    const [invitationCode, setInvitationCode] = useState<string>('')
    const [step, setStep] = useState<number>(0)
    const [isDownloaded, setIsDownloaded] = useState(false)
    const [userEnterIdentity, setUserEnterIdentity] = useState<string>('')
    const [errorMsg, setErrorMsg] = useState<string>('')
    const [isButtonLoading, setButtonLoading] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState(false)
    const [signupPromise, setSignupPromise] = useState<Promise<any>>(
        Promise.resolve()
    )
    const [signupError, setSignupError] = useState<string | null>(null)

    const title = [
        'Join us',
        'Great to have you here!',
        "Let's confirm the ownership.",
        `🎉  NICE. <br>30 Rep + 3 personas awaits you!`,
    ]

    const content = [
        'Currently, UniRep Social is an invite only community. Please enter your invitation code below.',
        'UniRep Social’s anonymous reputation system uses a technology called Semaphore. It generates a secure private key that you use instead of a username and password to show that you’re a registered UniRep user. Yes, we know it’s not exactly easy to memorize - that’s why it’s very important for you to store it safely. <br> This key is how you access your UniRep account and Rep. We can not recover it for you if it’s lost. ',
        'Please paste your private key below.',
        'Now that you have confirmed ownership of your private key, it’s time to generate your weekly personas. In every cycle, members of the community  receive 3 different random strings to use as personas and 30 Rep. which are used for interactions. Let’s be kind to one another and start having fun!',
    ]

    const mainButton = ['Let me in', '', 'Submit', 'Generate']

    useEffect(() => {
        setErrorMsg('')
    }, [step, invitationCode, userEnterIdentity])

    const nextStep = async () => {
        if (step === 0) {
            // send to server to check if invitation code does exist
            // if exists, get identity and commitment
            setButtonLoading(true)
            const ret = await userContext.checkInvitationCode(invitationCode)
            if (ret) {
                const p = userContext
                    .signUp(invitationCode)
                    .catch((err) => setSignupError(err.toString()))
                setSignupPromise(p)
                setStep(1)
            } else {
                setErrorMsg(
                    'Umm...this is not working. Try again or request a new code.'
                )
            }
            setButtonLoading(false)
        } else if (step === 1) {
            if (isDownloaded) {
                navigator.clipboard.writeText(userContext.identity || '')
                setStep(2)
            }
        } else if (step === 2) {
            if (userEnterIdentity !== userContext.identity) {
                setErrorMsg('Incorrect private key. Please try again.')
            } else {
                setStep(3)
            }
        } else if (step === 3) {
            setButtonLoading(true)
            await signupPromise
            if (signupError === null) {
                postContext.getAirdrop()
            }
            history.push('/')
        }
    }

    const handleInput = (event: any) => {
        if (step === 0) {
            setInvitationCode(event.target.value)
        } else if (step === 2) {
            setUserEnterIdentity(event.target.value)
        }
    }

    const downloadPrivateKey = () => {
        if (!userContext.identity) throw new Error('Identity not initialized')
        const element = document.createElement('a')
        const file = new Blob([userContext.identity], { type: 'text/plain' })
        element.href = URL.createObjectURL(file)
        element.download = 'unirep-social-identity.txt'
        document.body.appendChild(element)
        element.click()

        setIsDownloaded(true)
    }

    return (
        <div className="signup-page">
            <div className="left-column">
                <img
                    src={require('../../../public/images/unirep-title-white.svg')}
                />
            </div>
            <div className="right-column">
                {step === 0 ? (
                    <div className="close">
                        <img
                            id="unirep-icon"
                            src={require('../../../public/images/unirep-title-white.svg')}
                        />
                        <img
                            id="close-icon"
                            src={require('../../../public/images/close.svg')}
                            onClick={() => history.push('/')}
                        />
                    </div>
                ) : (
                    <div></div>
                )}
                <div className="info">
                    <div className="title">
                        {title[step].split('<br>').map((t) => (
                            <span key={t}>
                                {t}
                                <br />
                            </span>
                        ))}
                    </div>
                    <div>
                        {content[step].split('<br>').map((t) => (
                            <span key={t}>
                                {t}
                                <br />
                            </span>
                        ))}
                    </div>
                    {step === 3 ? (
                        <div></div>
                    ) : (
                        <textarea
                            className={step === 0 ? '' : 'larger'}
                            onChange={handleInput}
                            value={
                                step === 0
                                    ? invitationCode
                                    : step === 1
                                    ? userContext.identity
                                    : step === 2
                                    ? userEnterIdentity
                                    : ''
                            }
                        />
                    )}
                    {errorMsg.length === 0 ? (
                        <div></div>
                    ) : (
                        <div className="error">{errorMsg}</div>
                    )}
                    {step === 1 ? (
                        <div className="row-with-step">
                            <div className="buttons">
                                <div
                                    className={
                                        isDownloaded
                                            ? 'half-btn disabled'
                                            : 'half-btn'
                                    }
                                    onClick={downloadPrivateKey}
                                >
                                    Download
                                </div>
                                <div className="margin"></div>
                                <div
                                    className={
                                        isDownloaded
                                            ? 'half-btn'
                                            : 'half-btn disabled'
                                    }
                                    onClick={nextStep}
                                >
                                    Copy
                                </div>
                            </div>
                            <div className="step">
                                <div
                                    className={
                                        isDownloaded
                                            ? 'number disabled'
                                            : 'number'
                                    }
                                >
                                    1
                                </div>
                                <div
                                    className={
                                        isDownloaded ? 'line' : 'line disabled'
                                    }
                                ></div>
                                <div
                                    className={
                                        isDownloaded
                                            ? 'number'
                                            : 'number disabled'
                                    }
                                >
                                    2
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="main-btn" onClick={nextStep}>
                            <LoadingButton
                                isLoading={isButtonLoading}
                                name={mainButton[step]}
                            />
                        </div>
                    )}
                    {signupError && (
                        <>
                            <div style={{ height: '20px' }} />
                            <div className="error">
                                There was a problem signing up, please try again
                                later! "{signupError}"
                            </div>
                        </>
                    )}
                    <div className="added-info">
                        Need an invitation code?{' '}
                        <a
                            href={`${ABOUT_URL}/alpha-invitation`}
                            target="_blank"
                        >
                            Request here
                        </a>
                    </div>
                </div>
            </div>
            {isLoading ? <LoadingCover /> : <div></div>}
        </div>
    )
}

export default observer(SignupPage)
