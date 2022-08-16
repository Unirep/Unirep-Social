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

const SignupBox = () => {
    const userContext = useContext(UserContext)
    const postContext = useContext(PostContext)

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
                <SignupBox />
            ) : step === StepType.onboarded ? (
                <OnboardedBox />
            ) : step === StepType.signin ? (
                <SigninBox setStep={setStep} />
            ) : null}
        </div>
    )
}

export default observer(StartPage)
