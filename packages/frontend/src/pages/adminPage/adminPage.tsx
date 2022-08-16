import { useContext, useEffect, useState } from 'react'

import { WebContext } from '../../context/WebContext'

import { checkIsAdminCodeValid, adminLogin } from '../../utils'
import AdminTable from './adminTable'
import AdminLoginPage from './adminLoginPage'

enum AdminPageStatus {
    loading,
    login,
    available,
}

const AdminPage = () => {
    const { adminCode, setAdminCode } = useContext(WebContext)
    const [status, setStatus] = useState<AdminPageStatus>(
        AdminPageStatus.loading
    )

    useEffect(() => {
        const checkAdminCode = async () => {
            if (adminCode.length === 0) {
                setStatus(AdminPageStatus.login)
            } else {
                const ret = await checkIsAdminCodeValid(adminCode)
                if (ret) {
                    setStatus(AdminPageStatus.available)
                } else {
                    setStatus(AdminPageStatus.login)
                }
            }
        }

        checkAdminCode()
    }, [])

    const submit = async (id: string, password: string) => {
        const ret = await adminLogin(id, password)
        if (ret.length > 0) {
            setAdminCode(ret)
            setStatus(AdminPageStatus.available)
        }
    }

    return (
        <div className="body-columns">
            <div className="content">
                {status === AdminPageStatus.loading ? (
                    <h2>LOADING...</h2>
                ) : status === AdminPageStatus.available ? (
                    <AdminTable />
                ) : (
                    <AdminLoginPage submit={submit} />
                )}
            </div>
        </div>
    )
}

export default AdminPage
