import { useHistory } from 'react-router-dom'

export enum BoxStyle {
    light,
    dark,
}

export enum ButtonStyle {
    light,
    dark,
    grey,
}

export enum ButtonAlign {
    vertical = 1,
    horizontal = 2,
}

type Props = {
    children: any
    bg: string
    boxStyle: BoxStyle
    hasBack: boolean
    backFunction?: () => void
    hasClose: boolean
    stepNum?: number
    currentStep?: number
    bottomBtns?: number
}

const CustomBox = (props: Props) => {
    const history = useHistory()

    const gotoHomePage = () => {
        history.push('/')
    }
    return (
        <div
            className="custom-box-container"
            style={{
                backgroundImage: `url(${require(`../../public/images/${props.bg}.svg`)})`,
            }}
        >
            <div className="top-buttons">
                <img
                    id="back"
                    src={require('../../public/images/back.svg')}
                    style={{ display: props.hasBack ? 'block' : 'none' }}
                    onClick={props.backFunction}
                />
                <img
                    id="close"
                    src={require('../../public/images/close.svg')}
                    style={{ display: props.hasClose ? 'block' : 'none' }}
                    onClick={gotoHomePage}
                />
            </div>
            {props.stepNum && (
                <div className="steps">
                    {[...Array(props.stepNum).keys()].map((n) => (
                        <div
                            className="step"
                            key={n}
                            style={{
                                backgroundImage:
                                    props.currentStep !== undefined &&
                                    n <= props.currentStep
                                        ? `url(${require('../../public/images/progress-bg.png')})`
                                        : '',
                            }}
                        ></div>
                    ))}
                </div>
            )}
            <div
                className={
                    props.boxStyle === BoxStyle.dark
                        ? props.bottomBtns
                            ? 'box box-dark box-with-bottom-btns'
                            : 'box box-dark'
                        : props.bottomBtns
                        ? 'box box-light box-with-bottom-btns'
                        : 'box box-light'
                }
            >
                {props.children}
            </div>
        </div>
    )
}

export default CustomBox
