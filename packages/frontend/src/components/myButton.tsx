export enum MyButtonType {
    dark = 'button-dark',
    light = 'button-light',
    darkTrans = 'button-dark-transparent',
    lightTrans = 'button-light-transparent',
    disabled = 'button-disabled',
}

type Props = {
    type: MyButtonType
    children: any
    onClick?: () => void
    fullSize?: boolean
    textAlignMiddle?: boolean
    disabled?: boolean
    fontSize?: number
    fontWeight?: number
}

const MyButton = ({
    type,
    children,
    onClick,
    fullSize,
    textAlignMiddle,
    disabled,
    fontSize,
    fontWeight,
}: Props) => {
    return (
        <button
            className={`my-button ${type} ${fullSize ? 'full-size' : ''} ${
                textAlignMiddle ? 'my-button-middle' : ''
            }`}
            onClick={onClick}
            disabled={disabled}
            style={{
                fontSize: `${fontSize ? `${fontSize}px` : '16px'}`,
                fontWeight: `${fontWeight ?? '400'}`,
            }}
        >
            {children}
        </button>
    )
}

export default MyButton
