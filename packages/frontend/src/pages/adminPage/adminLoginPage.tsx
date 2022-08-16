import { useState, useContext } from 'react'
import { WebContext } from '../../context/WebContext'

type Props = {
    submit: (id: string, password: string) => void
}

const AdminLoginPage = ({ submit }: Props) => {
    const { setAdminCode } = useContext(WebContext)
    const [id, setId] = useState<string>('')
    const [password, setPassword] = useState<string>('')

    const handleIdInput = (event: any) => {
        setId(event.target.value)
    }

    const handlePasswordInput = (event: any) => {
        setPassword(event.target.value)
    }

    return (
        <div className="admin-main">
            <h3>Admin Login</h3>
            <input
                type="text"
                placeholder="enter admin id"
                onChange={handleIdInput}
            />
            <input
                type="text"
                placeholder="enter admin password"
                onChange={handlePasswordInput}
            />
            <input
                type="submit"
                value="Submit"
                onClick={() => submit(id, password)}
            />
        </div>
    )
}

export default AdminLoginPage
