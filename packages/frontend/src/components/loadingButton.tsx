type Props = {
    isLoading: boolean
    name: string
}

const LoadingButton = ({ isLoading, name }: Props) => {
    return (
        <div className={`loading-btn${isLoading ? ' isLoading' : ''}`}>
            {name}
        </div>
    )
}

export default LoadingButton
