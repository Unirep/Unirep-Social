import { useState, useContext, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useLocation } from 'react-router-dom'

import UserContext from '../../context/User'

import GetStarted from './getStarted'
import Signin from './signin'
import Onboarded from './onboarded'

enum StepType {
    getstarted = 'getstarted',
    onboarded = 'onboarded',
    signin = 'signin',
}

const StartPage = () => {
    const location = useLocation()
    const params = new URLSearchParams(location.search)
    const [step, setStep] = useState<StepType>(
        params.get('signupCode') || params.get('signupError')
            ? StepType.onboarded
            : StepType.getstarted
    )

    const userContext = useContext(UserContext)

    useEffect(() => {
        if (params.get('signupCode')) {
            // we have a signup code, register and make an identity
            userContext
                .signUp(params.get('signupCode') as string)
                .then(() => setStep(StepType.onboarded))
        }
    }, [])

    return (
        <div
            className="start-page"
            style={{
                backgroundImage: `url(${require(`../../../public/images/bg-${step}.svg`)})`,
            }}
        >
            {step === StepType.getstarted ? (
                <GetStarted signin={() => setStep(StepType.signin)} />
            ) : step === StepType.onboarded ? (
                <Onboarded />
            ) : step === StepType.signin ? (
                <Signin getStarted={() => setStep(StepType.getstarted)} />
            ) : null}
        </div>
    )
}

export default observer(StartPage)
