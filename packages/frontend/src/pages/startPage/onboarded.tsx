import { useHistory } from 'react-router-dom'

import CustomBox, { BoxStyle } from '../../components/customBox'
import CustomGap from '../../components/customGap'
import MyButton, { MyButtonType } from '../../components/myButton'

const Onboarded = () => {
    const history = useHistory()

    const gotoHomePage = () => {
        history.push('/')
    }

    const gotoSettingPage = () => {
        history.push('/setting', { isConfirmed: true })
    }

    return (
        <CustomBox
            bg="bg-onboarded"
            boxStyle={BoxStyle.dark}
            hasBack={false}
            hasClose={true}
            bottomBtns={1}
        >
            <h1 className="title">🎉 You’re in!</h1>
            <h3>30 Rep + 3 personas await you! </h3>
            <CustomGap times={8} />
            <p>
                Excellent! One huge difference of UniRep Social is that you
                don’t have to interact with any wallet, we have come up with
                this solution to smooth out the experience. If you are
                interested, you can learn more from our developer document.
            </p>
            <p>Enjoy your journey in UniRep Social!</p>
            <div className="gap"></div>
            <div className="box-buttons box-buttons-bottom">
                <MyButton
                    type={MyButtonType.lightTrans}
                    onClick={gotoHomePage}
                    fullSize={true}
                    textAlignMiddle={true}
                    fontWeight={600}
                >
                    Get in
                </MyButton>
                <CustomGap times={2} />
                <MyButton
                    type={MyButtonType.light}
                    onClick={gotoSettingPage}
                    fullSize={true}
                    textAlignMiddle={true}
                    fontWeight={600}
                >
                    Grab my private key
                </MyButton>
            </div>
        </CustomBox>
    )
}

export default Onboarded
