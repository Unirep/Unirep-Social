import { Page } from '../../constants'

type Props = {
    // to be used in the future
    page: Page
}

const ReminderWidget = ({ page }: Props) => {
    return (
        <div className="reminder-widget widget">
            <h3>Reminders</h3>
            <div className="divider"></div>
            <p>Be respectful.</p>
            {/* <div className="divider"></div>
            <p>Our current topic: Ethereum.</p> */}
            <div className="divider"></div>
            <p>
                {page === Page.New
                    ? 'Create post will use 5 Rep.'
                    : 'Create comment will use 3 Rep.'}
            </p>
            <div className="divider"></div>
            <p>Please keep all posts in English.</p>
        </div>
    )
}

export default ReminderWidget
