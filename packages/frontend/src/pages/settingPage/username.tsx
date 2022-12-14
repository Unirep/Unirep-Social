import { useState, useContext } from 'react'
import QueueContext, { Metadata } from '../../context/Queue'
import UserContext from '../../context/User'
import EpochManager from '../../context/EpochManager'

import CustomInput from '../../components/customInput'
import MyButton, { MyButtonType } from '../../components/myButton'
import CustomGap from '../../components/customGap'
import { ActionType } from '../../constants'

const Username = () => {
    const [username, setUsername] = useState<string>('') // default put user.username
    const [errorMsg, setErrorMsg] = useState<string>('')
    const [isApplied, setIsApplied] = useState<boolean>(false)
    const queue = useContext(QueueContext)
    const user = useContext(UserContext)
    const epochManager = useContext(EpochManager)

    const onChange = (event: any) => {
        setUsername(event.target.value)
        setErrorMsg('')
        setIsApplied(false) // if setting up user name is unlimited in each epoch
    }

    const submit = () => {
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
                setIsApplied(true)

                let metadata: Metadata = {
                    transactionId: transaction,
                }
                return metadata
            },
            {
                type: ActionType.Username,
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
                />
                <CustomGap times={2} />
                <MyButton
                    type={MyButtonType.dark}
                    onClick={submit}
                    fullSize={true}
                    textAlignMiddle={true}
                    fontWeight={600}
                    disabled={isApplied}
                >
                    {isApplied ? 'Applied' : 'Apply'}
                </MyButton>
                {errorMsg.length > 0 && (
                    <div>
                        <CustomGap times={2} />
                        <div className="error-msg">{errorMsg}</div>
                    </div>
                )}
                {isApplied && (
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
