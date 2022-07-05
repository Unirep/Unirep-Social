import { useHistory } from 'react-router-dom'
import { useContext, useState, useEffect } from 'react'

import { ABOUT_URL } from '../../config'

import LoadingCover from '../../components/loadingCover/loadingCover'
import LoadingButton from '../../components/loadingButton/loadingButton'
import UserContext from '../../context/User'

const LoginPage = () => {
    const history = useHistory()
    const [isLoading, setIsLoading] = useState(false)
    const [input, setInput] = useState<string>('')
    const [errorMsg, setErrorMsg] = useState<string>('')
    const [isButtonLoading, setButtonLoading] = useState<boolean>(false)
    const userContext = useContext(UserContext)

    useEffect(() => {
        setErrorMsg('')
    }, [input])

    const handleInput = (event: any) => {
        setInput(event.target.value)
    }

    const login = async () => {
        setButtonLoading(true)
        const hasSignedUp = await userContext.login(input)
        setButtonLoading(false)

        if (!hasSignedUp) {
            setErrorMsg('Incorrect private key. Please try again.')
            return
        }
        // need to conditionally get an airdrop if the user signed up but has
        // not claimed an airdrop, and it's the same epoch as when they signed
        // up

        history.push('/')
    }

    return (
        <div className="login-page">
            <div className="left-column">
                <img
                    src={require('../../../public/images/unirep-title-white.svg')}
                />
            </div>
            <div className="right-column">
                <div className="close">
                    <img
                        id="unirep-icon"
                        src={require('../../../public/images/unirep-title.svg')}
                    />
                    <img
                        id="close-icon"
                        src={require('../../../public/images/close.svg')}
                        onClick={() => history.push('/')}
                    />
                </div>
                <div className="info">
                    <div className="title">Welcome back</div>
                    <p>
                        To enter the app, please use the private key you got
                        when you signed up.
                    </p>
                    <textarea
                        placeholder="enter your private key here."
                        onChange={handleInput}
                    />
                    {errorMsg.length === 0 ? (
                        <div></div>
                    ) : (
                        <div className="error">{errorMsg}</div>
                    )}
                    <div className="sign-in-btn" onClick={login}>
                        <LoadingButton
                            isLoading={isButtonLoading}
                            name="Sign in"
                        />
                    </div>
                    <div className="notification">
                        Lost your private key? Hummm... we can't help you to
                        recover it, that's a lesson learned for you. Want to
                        restart to earn rep points?{' '}
                        <a
                            target="_blank"
                            href={`${ABOUT_URL}/alpha-invitation`}
                        >
                            Request an invitation code here.
                        </a>
                    </div>
                    <div className="go-to-signup">
                        Got an invitation code? <a href="/signup">Join here</a>
                    </div>
                </div>
            </div>
            {isLoading ? <LoadingCover /> : <div></div>}
        </div>
    )
}

export default LoginPage
