import { useState } from 'react'

type Props = {
    id?: string
    title: string
    onChange: (event: any) => void
}

const CustomInput = ({ id, title, onChange }: Props) => {
    const [visible, setVisible] = useState<boolean>(false)

    return (
        <div className="custom-input-box">
            <label htmlFor={id}>{title}</label>
            <div className="custom-input">
                <input
                    id={id}
                    onChange={onChange}
                    type={visible ? 'text' : 'password'}
                />
                <img
                    src={require(`../../public/images/eye${
                        visible ? '-slash' : ''
                    }.svg`)}
                    onClick={() => setVisible(!visible)}
                />
            </div>
        </div>
    )
}

export default CustomInput
