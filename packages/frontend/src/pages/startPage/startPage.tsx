import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useLocation } from 'react-router-dom'

import GetStarted from './getStarted'
import Signup from './signup'
import Signin from './signin'
import Onboarded from './onboarded'

enum StepType {
    getstarted = 'getstarted',
    onboarded = 'onboarded',
    signin = 'signin',
    signup = 'signup',
}

const StartPage = () => {
    const location = useLocation()
    const params = new URLSearchParams(location.search)
    const [step, setStep] = useState<StepType>(
        params.get('signupCode') ? StepType.signup : StepType.getstarted
    )

    return (
        <div
            className="start-page"
            style={{
                backgroundImage: `url(${require(`../../../public/images/bg-${step}.svg`)})`,
            }}
        >
            {step === StepType.getstarted ? (
                <GetStarted
                    signin={() => setStep(StepType.signin)}
                    signup={() => setStep(StepType.signup)}
                />
            ) : step === StepType.signup ? (
                <Signup
                    onboarded={() => setStep(StepType.onboarded)}
                    getStarted={() => setStep(StepType.getstarted)}
                />
            ) : step === StepType.onboarded ? (
                <Onboarded />
            ) : step === StepType.signin ? (
                <Signin getStarted={() => setStep(StepType.getstarted)} />
            ) : null}
        </div>
    )
}

export default observer(StartPage)
