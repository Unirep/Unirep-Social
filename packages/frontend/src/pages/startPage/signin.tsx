import { useState } from 'react'
import { useHistory } from 'react-router-dom'

import CustomBox, { BoxStyle } from '../../components/customBox'
import CustomInput from '../../components/customInput'
import CustomGap from '../../components/customGap'

type Props = {
    getStarted: () => void
}

const Signin = ({ getStarted }: Props) => {
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
            <CustomGap times={2} />
            <p>
                We have deploy the contract on Optimism, that is different from
                the previous release. If you have previously use UniRep Social,
                the private key is no longer valid.
            </p>
            <p>Please paste the newly registered private key below</p>
            <textarea onChange={onInputChange} />
            <CustomGap times={2} />
            <CustomInput
                title="Password (Only if you need to decrypt)"
                onChange={onPwdChange}
            />
            <CustomGap times={4} />
            <div className="box-buttons box-buttons-bottom">
                <button className="button-dark" onClick={gotoHomePage}>
                    Sign in
                </button>
            </div>
        </CustomBox>
    )
}

export default Signin
