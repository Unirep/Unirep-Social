import { useState, useContext, useEffect } from 'react'

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
    const userContext = useContext(UserContext)
    const postContext = useContext(PostContext)

    const [step, setStep] = useState<number>(0)
    const [pwd, setPwd] = useState<string>('')
    const [confirmPwd, setConfirmPwd] = useState<string>('')
    const [isDownloaded, setIsDownloaded] = useState<boolean>(false)

    const onPwdChange = (event: any) => {
        setPwd(event.target.value)
        console.log('pwd:', event.target.value)
    }

    const onConfirmPwdChange = (event: any) => {
        setConfirmPwd(event.target.value)
        console.log('confirm pwd:', event.target.value)
    }

    const download = () => {
        // if (!userContext.identity) throw new Error('Identity not initialized')
        const element = document.createElement('a')
        // const file = new Blob([userContext.identity], { type: 'text/plain' })
        const file = new Blob(['something test'], { type: 'text/plain' })

        element.href = URL.createObjectURL(file)
        element.download = 'unirep-social-identity.txt'
        document.body.appendChild(element)
        element.click()

        setIsDownloaded(true)
    }

    const copy = () => {
        if (isDownloaded) {
            navigator.clipboard.writeText(
                userContext.identity || 'something is wrong'
            )
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

    return (
        <CustomBox
            bg="bg-signup"
            boxStyle={BoxStyle.light}
            hasBack={true}
            backFunction={back}
            hasClose={false}
            stepNum={4}
            currentStep={step}
        >
            {step === 0 ? (
                <>
                    <h2 className="title">Sign up</h2>
                    <CustomGap times={2} />
                    <p>
                        UniRep Social uses Interep for authentication. You can
                        sign up easily while maintaining your anonymity.
                    </p>
                    <CustomGap times={3} />
                    <div className="box-buttons box-buttons-smaller">
                        <button
                            className="button-dark-transparent button-with-img"
                            onClick={() => setStep(step + 1)}
                        >
                            Twitter{' '}
                            <img
                                src={require('../../../public/images/twitter.svg')}
                            />
                        </button>
                        <CustomGap times={1} />
                        <button
                            className="button-dark-transparent button-with-img"
                            onClick={() => setStep(step + 1)}
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
            ) : step === 1 ? (
                <>
                    <h2>Password for encryption</h2>
                    <CustomGap times={2} />
                    <p>
                        This is optional and only for your local environment.
                        The password is use for adding an extra layer of
                        security to the private key we are going to give you in
                        the next step.
                    </p>
                    <CustomGap times={2} />
                    <CustomInput title="Password" onChange={onPwdChange} />
                    <CustomGap times={2} />
                    <CustomInput
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
                            onClick={() => setStep(step + 1)}
                        >
                            Skip this
                        </button>
                        <button
                            className="button-dark"
                            onClick={() => setStep(step + 1)}
                        >
                            Encrypt it
                        </button>
                    </div>
                </>
            ) : step === 2 ? (
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
                    <textarea />
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
                            className={
                                isDownloaded
                                    ? 'button-dark disabled '
                                    : 'button-dark'
                            }
                            onClick={download}
                        >
                            Download
                        </button>
                        <button
                            className={
                                isDownloaded
                                    ? 'button-dark'
                                    : 'button-dark disabled'
                            }
                            onClick={copy}
                        >
                            Copy
                        </button>
                    </div>
                </>
            ) : step === 3 ? (
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
