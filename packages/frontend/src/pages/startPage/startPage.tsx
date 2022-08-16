import { useState, useContext } from 'react'
import { useHistory } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

import PostContext from '../../context/Post'
import UserContext from '../../context/User'

enum StepType {
    getstarted = 'getstarted',
    onboarded = 'onboarded',
    signin = 'signin',
    signup = 'signup',
}

type Props = {
    setStep: (step: StepType) => void
}

const GetStartedBox = ({ setStep }: Props) => {
    return (
        <div className="box box-dark">
            <div className="title">GM!</div>
            <p>
                Great to have you here.Currently, UniRep Social is an
                experimental & research use dApp. We are part of Privacy &
                Scaling Explorations team that specialized in zero-knowledge
                proof and advance blockchain technology.
            </p>
            <p>
                Our mission is to empower the general public to have full
                privacy under the social media setup, while earning the
                reputation they deserved. It’s tricky, but yes, we know it’s
                very important.
            </p>
            <div className="gap"></div>
            <div className="box-buttons">
                <button
                    className="button-light"
                    onClick={() => setStep(StepType.signup)}
                >
                    Sign Up
                </button>
                <div className="gap"></div>
                <button
                    className="button-dark"
                    onClick={() => setStep(StepType.signin)}
                >
                    Sign In
                </button>
            </div>
            <div className="gap"></div>
            <p>
                If you have previously used UniRep, you might need to re-sign up
                again, since we have change the network.{' '}
            </p>
        </div>
    )
}

const SignupBox = ({ setStep }: Props) => {
    const userContext = useContext(UserContext)
    const postContext = useContext(PostContext)

    const [progress, setProgress] = useState<number>(0)
    const [pwd, setPwd] = useState<string>('')
    const [confirmPwd, setConfirmPwd] = useState<string>('')

    const onPwdChange = (event: any) => {
        setPwd(event.target.value)
        console.log('pwd:', event.target.value)
    }

    const onConfirmPwdChange = (event: any) => {
        setConfirmPwd(event.target.value)
        console.log('confirm pwd:', event.target.value)
    }

    const download = () => {}

    const copy = () => {
        setProgress(progress + 1)
    }

    return (
        <div className="box box-light">
            {progress === 0 ? (
                <>
                    <div className="title">Sign up</div>
                    <p>
                        UniRep Social uses Interep for authentication. You can
                        sign up easily while maintaining your anonymity.
                    </p>
                    <div className="gap"></div>
                    <div className="box-buttons">
                        <button
                            className="button-light"
                            onClick={() => setProgress(progress + 1)}
                        >
                            Twitter{' '}
                            <img
                                src={require('../../../public/images/twitter.svg')}
                            />
                        </button>
                        <div className="gap"></div>
                        <button
                            className="button-light"
                            onClick={() => setProgress(progress + 1)}
                        >
                            Github{' '}
                            <img
                                src={require('../../../public/images/github.svg')}
                            />
                        </button>
                        <div className="gap"></div>
                        <button
                            className="button-light"
                            onClick={() => setProgress(progress + 1)}
                        >
                            Reddit{' '}
                            <img
                                src={require('../../../public/images/reddit.svg')}
                            />
                        </button>
                    </div>
                    <div className="gap"></div>
                    <p>
                        We don't store your user information, we use it to
                        generate a proof that you have an identity.
                    </p>
                </>
            ) : progress === 1 ? (
                <>
                    <div className="title">Password for encryption</div>
                    <input placeholder="Password" onChange={onPwdChange} />
                    <div className="gap"></div>
                    <input
                        placeholder="Confirm password"
                        onChange={onConfirmPwdChange}
                    />
                    <div className="gap"></div>
                    <p>
                        Keep in mind, this password is <strong>NOT</strong>{' '}
                        recoverable. If you lost one day, we won’t be able to
                        help you.
                    </p>
                    <div className="box-buttons buttons-horizontal">
                        <button
                            className="button-light"
                            onClick={() => setProgress(progress + 1)}
                        >
                            Skip this
                        </button>
                        <button
                            className="button-dark"
                            onClick={() => setProgress(progress + 1)}
                        >
                            Encrypt it
                        </button>
                    </div>
                </>
            ) : progress === 2 ? (
                <>
                    <div className="title">The most important, private key</div>
                    <p>
                        UniRep Social uses a zero-knowledge gadget called{' '}
                        <strong>Semaphore</strong> to generates a secure private
                        key. This is the only key for you to access your UniRep
                        Social and Rep points.{' '}
                    </p>
                    <textarea />
                    <p>
                        <strong>
                            ⚠️​ It’s very important for you to store it
                            safely.⚠️​{' '}
                        </strong>
                        <br />
                        We can not recover it for you if it’s lost. ️​
                    </p>
                    <div className="box-buttons buttons-horizontal">
                        <button className="button-light" onClick={download}>
                            Download
                        </button>
                        <button className="button-dark" onClick={copy}>
                            Copy
                        </button>
                    </div>
                </>
            ) : progress === 3 ? (
                <>
                    <div className="title">Have a practice</div>
                    <p>
                        The private key you just copied is used for signing in
                        to the UniRep social, let’s give a try.
                    </p>
                    <p>Please paste the private key below ️​</p>
                    <textarea />
                    <div className="gap"></div>
                    <div className="gap"></div>
                    <div className="box-buttons">
                        <button
                            className="button-dark"
                            onClick={() => setStep(StepType.onboarded)}
                        >
                            Submit
                        </button>
                    </div>
                </>
            ) : null}
        </div>
    )
}

const OnboardedBox = () => {
    return (
        <div className="box box-dark">
            <div className="title">GM!</div>
            <p>
                Great to have you here.Currently, UniRep Social is an
                experimental & research use dApp. We are part of Privacy &
                Scaling Explorations team that specialized in zero-knowledge
                proof and advance blockchain technology.
            </p>
            <p>
                Our mission is to empower the general public to have full
                privacy under the social media setup, while earning the
                reputation they deserved. It’s tricky, but yes, we know it’s
                very important.
            </p>
        </div>
    )
}

const SigninBox = ({ setStep }: Props) => {
    const [input, setInput] = useState<string>('')
    const [pwd, setPwd] = useState<string>('')
    const history = useHistory()

    const onInputChange = (event: any) => {
        setInput(event.target.value)
        console.log(event.target.value)
    }

    const onPwdChange = (event: any) => {
        setPwd(event.target.value)
        console.log(event.target.value)
    }

    const gotoHomePage = () => {
        history.push('/')
    }

    return (
        <div className="box box-light">
            <div className="title">Sign in</div>
            <p>
                We have deploy the contract on Optimism, that is different from
                the previous release. If you have previously use UniRep Social,
                the private key is no longer valid.
            </p>
            <p>Please paste the newly registered private key below</p>
            <textarea onChange={onInputChange} />
            <div className="gap"></div>
            <p>If you have setup the encryption password, please enter here</p>
            <input
                onChange={onPwdChange}
                placeholder="Password (Only if you need to decrypt)"
            />
            <div className="gap"></div>
            <div className="box-buttons">
                <button className="button-dark" onClick={gotoHomePage}>
                    Sign in
                </button>
            </div>
            <p>
                Need an access?{' '}
                <strong onClick={() => setStep(StepType.signup)}>
                    Sign up here
                </strong>
            </p>
        </div>
    )
}

const StartPage = () => {
    const [step, setStep] = useState<StepType>(StepType.getstarted)

    return (
        <div
            className="start-page"
            style={{
                backgroundImage: `url(${require(`../../../public/images/bg-${step}.svg`)})`,
            }}
        >
            {step === StepType.getstarted ? (
                <GetStartedBox setStep={setStep} />
            ) : step === StepType.signup ? (
                <SignupBox setStep={setStep} />
            ) : step === StepType.onboarded ? (
                <OnboardedBox />
            ) : step === StepType.signin ? (
                <SigninBox setStep={setStep} />
            ) : null}
        </div>
    )
}

export default observer(StartPage)
