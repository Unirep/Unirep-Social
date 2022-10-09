export enum MyButtonType {
    dark = 'button-dark',
    light = 'button-light',
    darkTrans = 'button-dark-transparent',
    lightTrans = 'button-light-transparent',
}

type Props = {
    type: MyButtonType
    children: any
    onClick?: () => void
    fullSize?: boolean
}

const MyButton = ({ type, children, onClick, fullSize }: Props) => {
    return (
        <button
            className={`my-button ${type} ${fullSize ? 'full-size' : ''}`}
            onClick={onClick}
        >
            {children}
        </button>
    )
}

export default MyButton
