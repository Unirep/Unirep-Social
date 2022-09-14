import { useState, useContext } from 'react'
import { useHistory } from 'react-router-dom'

import UserContext from '../../context/User'

import CustomBox, { BoxStyle } from '../../components/customBox'
import CustomInput from '../../components/customInput'
import CustomGap from '../../components/customGap'

type Props = {
    getStarted: () => void
}

const Signin = ({ getStarted }: Props) => {
    const userContext = useContext(UserContext)
    const [input, setInput] = useState<string>('')
    const [pwd, setPwd] = useState<string>('')
    const [error, setError] = useState('')
    const history = useHistory()

    const onInputChange = (event: any) => {
        setInput(event.target.value)
    }

    const onPwdChange = (event: any) => {
        setPwd(event.target.value)
    }

    const gotoHomePage = async () => {
        if (!pwd) {
            await userContext.login(input)
            history.push('/')
            return
        }
        try {
            const id = await userContext.decrypt(pwd, JSON.parse(input))
            await userContext.login(id)
            history.push('/')
        } catch (err) {
            console.log(err)
            setError('There was a problem decrypting your identity')
        }
    }

    return (
        <CustomBox
            bg="bg-signup"
            boxStyle={BoxStyle.light}
            hasBack={true}
            backFunction={getStarted}
            hasClose={false}
            bottomBtns={1}
        >
            <h2 className="title">Sign in</h2>
            <CustomGap times={2} />
            <p>
                We have deployed the contract on Optimism, that is different
                from the previous release. If you have previously used UniRep
                Social, the private key is no longer valid.
            </p>
            <p>Please paste the newly registered private key below</p>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <textarea onChange={onInputChange} />
            <CustomGap times={2} />
            <CustomInput
                id="passwordInput"
                title="Password (Only if you need to decrypt)"
                onChange={onPwdChange}
            />
            <CustomGap times={4} />
            <div className="box-buttons box-buttons-bottom">
                <button
                    id="signin"
                    className="button-dark"
                    onClick={gotoHomePage}
                >
                    Sign in
                </button>
            </div>
        </CustomBox>
    )
}

export default Signin
