import { useState } from 'react'

type Props = {
    id?: string
    title: string
    onChange: (event: any) => void
    conceal?: boolean
    disabled?: boolean
}

const CustomInput = ({ id, title, onChange, conceal, disabled }: Props) => {
    const [visible, setVisible] = useState<boolean>(false)

    return (
        <div className="custom-input-box">
            <label htmlFor={id}>{title}</label>
            <div className="custom-input">
                <input
                    id={id}
                    onChange={onChange}
                    type={!conceal || visible ? 'text' : 'password'}
                    disabled={disabled}
                />
                {conceal && (
                    <img
                        src={require(`../../public/images/eye${
                            visible ? '-slash' : ''
                        }.svg`)}
                        onClick={() => setVisible(!visible)}
                    />
                )}
            </div>
        </div>
    )
}

export default CustomInput
