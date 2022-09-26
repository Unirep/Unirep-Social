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
}

const MyButton = ({ type, children, onClick }: Props) => {
    return (
        <button className={`my-button ${type}`} onClick={onClick}>
            {children}
        </button>
    )
}

export default MyButton
