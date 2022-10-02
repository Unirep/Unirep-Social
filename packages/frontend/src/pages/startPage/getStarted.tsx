import CustomBox, { BoxStyle } from '../../components/customBox'
import CustomGap from '../../components/customGap'
import MyButton, { ButtonType } from '../../components/myButton'

type Props = {
    signin: () => void
    signup: () => void
}

const GetStarted = ({ signin, signup }: Props) => {
    return (
        <CustomBox
            bg="bg-getstarted"
            boxStyle={BoxStyle.dark}
            hasBack={false}
            hasClose={true}
        >
            <h1 className="title">GM!</h1>
            <p>
                Great to have you here. Currently, UniRep Social is an
                experimental & research use dApp. We are part of the Privacy &
                Scaling Explorations team that specializes in zero-knowledge
                proof and advanced blockchain technology.
            </p>
            <p>
                Our mission is to empower the general public to have full
                privacy under the social media setup, while earning the
                reputation they deserved. It’s tricky, but yes, we know it’s
                very important.
            </p>
            <CustomGap times={4} />
            <div className="box-buttons">
                <MyButton type={ButtonType.light} onClick={signup}>
                    Sign Up
                </MyButton>
                <CustomGap times={3} />
                <MyButton type={ButtonType.lightTrans} onClick={signin}>
                    Sign In
                </MyButton>
            </div>
            <CustomGap times={2} />
            <div className="note">
                If you have previously used UniRep, you might need to re-sign up
                again, since we have change the network.{' '}
            </div>
        </CustomBox>
    )
}

export default GetStarted
