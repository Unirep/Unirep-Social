export enum ButtonType {
    dark = 'button-dark',
    light = 'button-light',
    darkTrans = 'button-dark-transparent',
    lightTrans = 'button-light-transparent',
}

type Props = {
    type: ButtonType
    children: any
    onClick?: () => void
    fullSize?: boolean
    textAlignMiddle?: boolean
}

const MyButton = ({
    type,
    children,
    onClick,
    fullSize,
    textAlignMiddle,
}: Props) => {
    return (
        <button
            className={`my-button ${type} ${fullSize ? 'full-size' : ''} ${
                textAlignMiddle ? 'my-button-middle' : ''
            }`}
            onClick={onClick}
        >
            {children}
        </button>
    )
}

export default MyButton
