import MyButton, { ButtonType } from '../../components/myButton'
import CustomGap from '../../components/customGap'

type Props = {
    close: () => void
    deletePost: () => void
}

const AlertCover = ({ close, deletePost }: Props) => {
    return (
        <div className="alert-cover">
            <div className="blur-cover"></div>
            <div className="alert-box">
                <h3>Are you sure to delete this post?</h3>
                <CustomGap times={4} />
                <MyButton
                    type={ButtonType.dark}
                    fullSize={true}
                    onClick={close}
                >
                    Nevermind.
                </MyButton>
                <CustomGap times={2} />
                <MyButton
                    type={ButtonType.light}
                    fullSize={true}
                    onClick={deletePost}
                >
                    Yes, delete it.
                </MyButton>
            </div>
        </div>
    )
}

export default AlertCover
