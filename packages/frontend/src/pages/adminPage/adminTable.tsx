import { useState, useContext } from 'react'

import { WebContext } from '../../context/WebContext'

import { genInvitationCode } from '../../utils'

enum AdminActionType {
    GenInvitationCode,
}

const AdminTable = () => {
    const { adminCode } = useContext(WebContext)
    const [result, setResult] = useState<any>()

    const doAction = async (type: AdminActionType) => {
        if (type === AdminActionType.GenInvitationCode) {
            const ret = await genInvitationCode(adminCode)
            setResult(ret)
        }
    }

    return (
        <div className="admin-main">
            <div className="buttons">
                <div
                    className="button"
                    onClick={() => doAction(AdminActionType.GenInvitationCode)}
                >
                    GenInvitationCode
                </div>
            </div>
            <div className="result">{result}</div>
        </div>
    )
}

export default AdminTable
