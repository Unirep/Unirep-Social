import MyButton, { MyButtonType } from './myButton'
import CustomGap from './customGap'

type Props = {
    close: () => void
    deleteContent: () => void
}

const AlertCover = ({ close, deleteContent }: Props) => {
    return (
        <div className="alert-cover">
            <div className="blur-cover"></div>
            <div className="alert-box">
                <h3>Are you sure to delete this post?</h3>
                <CustomGap times={4} />
                <MyButton
                    type={MyButtonType.dark}
                    fullSize={true}
                    onClick={close}
                >
                    Nevermind.
                </MyButton>
                <CustomGap times={2} />
                <MyButton
                    type={MyButtonType.light}
                    fullSize={true}
                    onClick={deleteContent}
                >
                    Yes, delete it.
                </MyButton>
            </div>
        </div>
    )
}

export default AlertCover
