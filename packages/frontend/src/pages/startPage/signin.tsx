import { useState } from 'react'
import { useHistory } from 'react-router-dom'

import CustomBox, { BoxStyle } from '../../components/customBox'

type Props = {
    getStarted: () => void
    signup: () => void
}

const Signin = ({ getStarted, signup }: Props) => {
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
        <CustomBox
            bg="bg-signup"
            boxStyle={BoxStyle.light}
            hasBack={true}
            backFunction={getStarted}
            hasClose={false}
        >
            <h2 className="title">Sign in</h2>
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
                Need an access? <strong onClick={signup}>Sign up here</strong>
            </p>
        </CustomBox>
    )
}

export default Signin
