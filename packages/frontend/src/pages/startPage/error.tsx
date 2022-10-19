import CustomBox, { BoxStyle } from '../../components/customBox'
import CustomGap from '../../components/customGap'
import MyButton, { MyButtonType } from '../../components/myButton'

type Props = {
    getStarted: () => void
    signin: () => void
    errorMsg: string
}

const Error = ({ getStarted, signin, errorMsg }: Props) => {
    return (
        <CustomBox
            bg="bg-getstarted"
            boxStyle={BoxStyle.dark}
            backFunction={getStarted}
            hasBack={true}
            hasClose={true}
        >
            <h1 className="title">Oops!</h1>
            <p>{errorMsg}</p>

            <CustomGap times={4} />
            <div className="box-buttons">
                <MyButton type={MyButtonType.light} onClick={getStarted}>
                    Back
                </MyButton>
                <CustomGap times={2} />
                <MyButton type={MyButtonType.lightTrans} onClick={signin}>
                    Sign In
                </MyButton>
            </div>
        </CustomBox>
    )
}

export default Error
