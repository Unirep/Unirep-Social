import CustomBox, { BoxStyle } from '../../components/customBox'
import CustomGap from '../../components/customGap'
import MyButton, { ButtonType } from '../../components/myButton'

type Props = {
    getStarted: () => void
    signin: () => void
}

const Error = ({ getStarted, signin }: Props) => {
    return (
        <CustomBox
            bg="bg-getstarted"
            boxStyle={BoxStyle.dark}
            backFunction={getStarted}
            hasBack={true}
            hasClose={true}
        >
            <h1 className="title">Oops!</h1>
            <p>
                You might use this account to sign up before, please try to sign
                in.
            </p>
            <CustomGap times={4} />
            <div className="box-buttons">
                <MyButton type={ButtonType.light} onClick={signin}>
                    Sign In
                </MyButton>
            </div>
        </CustomBox>
    )
}

export default Error
