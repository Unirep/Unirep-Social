type Props = {
    times: number
}

const CustomGap = ({ times }: Props) => {
    return <div style={{ height: `${8 * times}px` }}></div>
}

export default CustomGap
