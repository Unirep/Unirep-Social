import CustomBox, { BoxStyle } from '../../components/customBox'
import CustomGap from '../../components/customGap'

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
                Great to have you here.Currently, UniRep Social is an
                experimental & research use dApp. We are part of Privacy &
                Scaling Explorations team that specialized in zero-knowledge
                proof and advance blockchain technology.
            </p>
            <p>
                Our mission is to empower the general public to have full
                privacy under the social media setup, while earning the
                reputation they deserved. It’s tricky, but yes, we know it’s
                very important.
            </p>
            <CustomGap times={4} />
            <div className="box-buttons">
                <button className="button-light" onClick={signup}>
                    Sign Up
                </button>
                <CustomGap times={3} />
                <button className="button-light-transparent" onClick={signin}>
                    Sign In
                </button>
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
