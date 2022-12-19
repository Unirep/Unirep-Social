import { useState, useContext } from 'react'
import QueueContext, { Metadata } from '../../context/Queue'
import UserContext from '../../context/User'
import EpochManager from '../../context/EpochManager'

import CustomInput from '../../components/customInput'
import MyButton, { MyButtonType } from '../../components/myButton'
import CustomGap from '../../components/customGap'
import { ActionType } from '@unirep-social/core'

enum SetUsernameStatus {
    default = 'Apply',
    applying = 'Applying...',
    applied = 'Applied',
}

const Username = () => {
    const [username, setUsername] = useState<string>('') // default put user.username
    const [errorMsg, setErrorMsg] = useState<string>('')
    const [status, setStatus] = useState<SetUsernameStatus>(
        SetUsernameStatus.default
    )
    const queue = useContext(QueueContext)
    const user = useContext(UserContext)
    const epochManager = useContext(EpochManager)

    const onChange = (event: any) => {
        if (status === SetUsernameStatus.applying) return

        setUsername(event.target.value)
        setErrorMsg('')
        setStatus(SetUsernameStatus.default)
    }

    const submit = () => {
        if (status === SetUsernameStatus.applying) return

        setStatus(SetUsernameStatus.applying)
        queue.addOp(
            async (updateStatus) => {
                updateStatus({
                    title: 'Performing Username Setup',
                    details: 'Generating ZK proof...',
                })
                const { transaction, error } = await user.setUsername(username)
                if (error) {
                    setErrorMsg(error)
                    throw new Error(error)
                }

                updateStatus({
                    title: 'Performing Username Setup',
                    details: 'Waiting for transaction...',
                })
                await queue.afterTx(transaction)
                await epochManager.updateWatch()
                setStatus(SetUsernameStatus.applied)

                let metadata: Metadata = {
                    transactionId: transaction,
                }
                return metadata
            },
            {
                type: ActionType.SetUsername,
            }
        )
    }

    return (
        <div className="setting-content">
            <div className="username">
                <CustomInput
                    title={'User name'}
                    onChange={onChange}
                    conceal={false}
                    disabled={status === SetUsernameStatus.applying}
                />
                <CustomGap times={2} />
                <MyButton
                    type={MyButtonType.dark}
                    onClick={submit}
                    fullSize={true}
                    textAlignMiddle={true}
                    fontWeight={600}
                    disabled={status !== SetUsernameStatus.default}
                >
                    {status}
                </MyButton>
                {errorMsg.length > 0 && (
                    <div>
                        <CustomGap times={2} />
                        <div className="error-msg">{errorMsg}</div>
                    </div>
                )}
                {status === SetUsernameStatus.applied && (
                    <div>
                        <CustomGap times={2} />
                        <p>This user name will apply to next epoch.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Username
