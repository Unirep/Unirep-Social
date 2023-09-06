import { useState, useContext, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useLocation } from 'react-router-dom'

import UserContext from '../../context/User'

import GetStarted from './getStarted'
import Signin from './signin'
import Onboarded from './onboarded'
import Error from './error'

enum StepType {
    getstarted = 'getstarted',
    onboarded = 'onboarded',
    signin = 'signin',
    error = 'error',
}

const StartPage = () => {
    const location = useLocation()
    const params = new URLSearchParams(location.search)
    const [step, setStep] = useState<StepType>(
        params.get('signupCode')
            ? StepType.onboarded
            : params.get('signupError')
            ? StepType.error
            : StepType.getstarted
    )
    const [error, setError] = useState<string>('')

    const userContext = useContext(UserContext)

    useEffect(() => {
        if (params.get('signupCode')) {
            // we have a signup code, register and make an identity
            userContext.signUp().then((ret) => {
                if (ret.error) {
                    setError(error)
                    setStep(StepType.error)
                } else {
                    setStep(StepType.onboarded)
                }
            })
        } else if (params.get('signupError')) {
            setError(
                'It seems like you already used this account to sign up before, try to sign in.'
            )
            setStep(StepType.error)
        }
    }, [])

    return (
        <div className="start-page">
            {step === StepType.getstarted ? (
                <GetStarted signin={() => setStep(StepType.signin)} />
            ) : step === StepType.onboarded ? (
                <Onboarded />
            ) : step === StepType.signin ? (
                <Signin getStarted={() => setStep(StepType.getstarted)} />
            ) : step === StepType.error ? (
                <Error
                    getStarted={() => setStep(StepType.getstarted)}
                    signin={() => setStep(StepType.signin)}
                    errorMsg={error}
                />
            ) : null}
        </div>
    )
}

export default observer(StartPage)
