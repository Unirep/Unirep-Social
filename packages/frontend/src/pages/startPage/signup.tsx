import { useState, useContext, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { SERVER } from '../../config'

import PostContext from '../../context/Post'
import UserContext from '../../context/User'

import CustomBox, { BoxStyle } from '../../components/customBox'
import CustomInput from '../../components/customInput'
import CustomGap from '../../components/customGap'

type Props = {
    onboarded: () => void
    getStarted: () => void
}

const Signup = ({ onboarded, getStarted }: Props) => {
    const location = useLocation()
    const params = new URLSearchParams(location.search)
    const userContext = useContext(UserContext)

    const [step, setStep] = useState<number>(0)
    const [pwd, setPwd] = useState<string>('')
    const [confirmPwd, setConfirmPwd] = useState<string>('')
    const [isDownloaded, setIsDownloaded] = useState<boolean>(false)
    const [pwdError, setPwdError] = useState('')
    const [serializedIden, setSerializedIden] = useState('')

    useEffect(() => {
        if (params.get('signupCode')) {
            // we have a signup code, register and make an identity
            userContext
                .signUp(params.get('signupCode') as string)
                .then(() => setStep(step + 1))
        }
    }, [])

    const twitterSignup = () => {
        // redirect to a signup page
        // then come back and resume once we have a signup code
        const url = new URL('/api/oauth/twitter', SERVER)
        const currentUrl = new URL(window.location.href)
        const dest = new URL('/start', currentUrl.origin)
        url.searchParams.set('redirectDestination', dest.toString())
        window.location.replace(url.toString())
    }

    const githubSignup = () => {
        // redirect to a signup page
        // then come back and resume once we have a signup code
        const url = new URL('/api/oauth/github', SERVER)
        const currentUrl = new URL(window.location.href)
        const dest = new URL('/start', currentUrl.origin)
        url.searchParams.set('redirectDestination', dest.toString())
        window.location.replace(url.toString())
    }

    const onPwdChange = (event: any) => {
        setPwd(event.target.value)
    }

    const onConfirmPwdChange = (event: any) => {
        setConfirmPwd(event.target.value)
    }

    const onConfirmPwd = async () => {
        if (pwd !== confirmPwd) {
            setPwdError('Passwords do not match')
        } else {
            setPwdError('')
            const encrypted = await userContext.encrypt(pwd)
            setSerializedIden(JSON.stringify(encrypted))
            setStep(step + 1)
        }
    }

    const onSkipPwd = () => {
        setSerializedIden(userContext.id?.serializeIdentity() as string)
        setStep(step + 1)
    }

    const download = () => {
        const element = document.createElement('a')
        const file = new Blob([serializedIden], { type: 'text/plain' })

        element.href = URL.createObjectURL(file)
        element.download = 'unirep-social-identity.txt'
        document.body.appendChild(element)
        element.click()

        setIsDownloaded(true)
    }

    const copy = () => {
        if (isDownloaded) {
            navigator.clipboard?.writeText(serializedIden)
            setStep(step + 1)
        }
    }

    const back = () => {
        if (step > 0) {
            setStep(step - 1)
        } else {
            getStarted()
        }
    }

    const buttomBtnsCount = [0, 2, 2, 1]
    const hasBack = [true, true, false, false]

    return (
        <CustomBox
            bg="bg-signup"
            boxStyle={BoxStyle.light}
            hasBack={hasBack[step]}
            backFunction={back}
            hasClose={false}
            stepNum={4}
            currentStep={step}
            bottomBtns={buttomBtnsCount[step]}
        >
            {step === 0 && !params.get('signupCode') ? (
                <>
                    <h2 className="title">Sign up</h2>
                    <CustomGap times={2} />
                    <p>
                        UniRep Social uses OAuth authentication. You can sign up
                        easily while maintaining your anonymity.
                    </p>
                    {params.get('signupError') && (
                        <p style={{ color: 'red' }}>
                            {params.get('signupError')}
                        </p>
                    )}
                    <CustomGap times={3} />
                    <div className="box-buttons box-buttons-smaller">
                        <button
                            className="button-dark-transparent button-with-img"
                            onClick={() => twitterSignup()}
                        >
                            Twitter{' '}
                            <img
                                src={require('../../../public/images/twitter.svg')}
                            />
                        </button>
                        <CustomGap times={1} />
                        <button
                            className="button-dark-transparent button-with-img"
                            onClick={() => githubSignup()}
                        >
                            Github{' '}
                            <img
                                src={require('../../../public/images/github.svg')}
                            />
                        </button>
                        <CustomGap times={1} />
                        <button
                            className="button-dark-transparent button-with-img"
                            onClick={() => setStep(step + 1)}
                        >
                            Reddit{' '}
                            <img
                                src={require('../../../public/images/reddit.svg')}
                            />
                        </button>
                    </div>
                    <CustomGap times={10} />
                    <div className="note">
                        We don't store your user information, we use it to
                        generate a proof that you have an identity.
                    </div>
                </>
            ) : null}
            {step === 0 && params.get('signupCode') ? (
                <>
                    <h2 className="title">Signing up...</h2>
                    <CustomGap times={2} />
                    <p>Success, we're signing you up now!</p>
                </>
            ) : null}
            {step === 1 ? (
                <>
                    <h2>Password for encryption</h2>
                    <CustomGap times={2} />
                    {pwdError && <p style={{ color: 'red' }}>{pwdError}</p>}
                    <p>
                        This is optional and only for your local environment.
                        The password is use for adding an extra layer of
                        security to the private key we are going to give you in
                        the next step.
                    </p>
                    <CustomGap times={2} />
                    <CustomInput
                        id="passwordInput"
                        title="Password"
                        onChange={onPwdChange}
                    />
                    <CustomGap times={2} />
                    <CustomInput
                        id="passwordConfirmInput"
                        title="Confirm password"
                        onChange={onConfirmPwdChange}
                    />
                    <CustomGap times={12} />
                    <div className="note">
                        Keep in mind, this password is <strong>NOT</strong>{' '}
                        recoverable. If you lost one day, we won’t be able to
                        help you.
                    </div>
                    <div className="box-buttons box-buttons-horizontal box-buttons-bottom">
                        <button
                            className="button-dark-transparent"
                            onClick={onSkipPwd}
                        >
                            Skip this
                        </button>
                        <button className="button-dark" onClick={onConfirmPwd}>
                            Encrypt it
                        </button>
                    </div>
                </>
            ) : null}
            {step === 2 ? (
                <>
                    <h2>The most important, private key</h2>
                    <CustomGap times={2} />
                    <p>
                        UniRep Social uses a zero-knowledge gadget called{' '}
                        <strong>Semaphore</strong> to generates a secure private
                        key. This is the only key for you to access your UniRep
                        Social and Rep points.{' '}
                    </p>
                    <CustomGap times={1} />
                    <textarea contentEditable={false} value={serializedIden} />
                    <CustomGap times={2} />
                    <p>
                        <strong>
                            ⚠️​ It’s very important for you to store it
                            safely.⚠️​{' '}
                        </strong>
                        <br />
                        We can not recover it for you if it’s lost. ️​
                    </p>
                    <CustomGap times={2} />
                    <div className="download-steps">
                        <div className="download-step">1</div>
                        <div
                            className={isDownloaded ? 'line' : 'line disabled'}
                        ></div>
                        <div
                            className={
                                isDownloaded
                                    ? 'download-step'
                                    : 'download-step disabled'
                            }
                        >
                            2
                        </div>
                    </div>
                    <div className="box-buttons box-buttons-horizontal box-buttons-bottom">
                        <button
                            className="button-dark"
                            onClick={download}
                            disabled={isDownloaded}
                        >
                            Download
                        </button>
                        <button
                            className={`button-dark ${
                                isDownloaded ? '' : 'disabled'
                            }`}
                            onClick={copy}
                            disabled={!isDownloaded}
                        >
                            Copy
                        </button>
                    </div>
                </>
            ) : null}
            {step === 3 ? (
                <>
                    <h2>Have a practice</h2>
                    <CustomGap times={2} />
                    <p>
                        The private key you just copied is used for signing in
                        to the UniRep social, let’s give a try.
                    </p>
                    <p>Please paste the private key below ️​</p>
                    <textarea />
                    <div className="box-buttons box-buttons-bottom">
                        <button className="button-dark" onClick={onboarded}>
                            Submit
                        </button>
                    </div>
                </>
            ) : null}
        </CustomBox>
    )
}

export default Signup
