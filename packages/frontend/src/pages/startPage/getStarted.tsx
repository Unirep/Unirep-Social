import CustomBox, { BoxStyle } from '../../components/customBox'
import CustomGap from '../../components/customGap'
import MyButton, { MyButtonType } from '../../components/myButton'
import { SERVER } from '../../config'

type Props = {
    signin: () => void
}

const GetStarted = ({ signin }: Props) => {
    const twitterSignup = () => {
        // redirect to a signup page
        // then come back and resume once we have a signup code
        const url = new URL('/api/oauth/twitter', SERVER)
        const currentUrl = new URL(window.location.href)
        const dest = new URL('/start', currentUrl.origin)
        url.searchParams.set('redirectDestination', dest.toString())
        window.location.replace(url.toString())
    }

    const githubSignup = () => {
        // redirect to a signup page
        // then come back and resume once we have a signup code
        const url = new URL('/api/oauth/github', SERVER)
        const currentUrl = new URL(window.location.href)
        const dest = new URL('/start', currentUrl.origin)
        url.searchParams.set('redirectDestination', dest.toString())
        window.location.replace(url.toString())
    }

    return (
        <CustomBox
            bg="bg-getstarted"
            boxStyle={BoxStyle.dark}
            hasBack={false}
            hasClose={true}
        >
            <h1 className="title">GM!</h1>
            <p>
                👋​ Great to have you here, Please select one of following to
                start. We only use your social ID to generate an identity proof,
                you are fully anonymous here.
            </p>
            <CustomGap times={4} />
            <div className="box-buttons">
                <MyButton
                    type={MyButtonType.light}
                    onClick={() => twitterSignup()}
                >
                    Twitter
                    <img src={require('../../../public/images/twitter.svg')} />
                </MyButton>
                <CustomGap times={2} />
                <MyButton
                    type={MyButtonType.light}
                    onClick={() => githubSignup()}
                >
                    Github
                    <img src={require('../../../public/images/github.svg')} />
                </MyButton>
                <CustomGap times={2} />
                <MyButton type={MyButtonType.lightTrans} onClick={signin}>
                    Sign In
                </MyButton>
            </div>
            <CustomGap times={3} />
            <div className="note">
                If you have previously used UniRep, you might need to re-sign up
                again, since we have change the network.{' '}
            </div>
        </CustomBox>
    )
}

export default GetStarted
