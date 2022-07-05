const LoadingCover = () => {
    return (
        <div className="loading-cover">
            <div className="loading-main">
                <h2>Generating your weekly persona</h2>
                <img
                    src={require('../../../public/images/user-state-generating.gif')}
                />
                <div className="normal-font">
                    This process will take about 20 seconds. Please do not close
                    this window while in progress.
                </div>
                <div className="small-font">
                    UniRep is built with care, care comes with patience.
                </div>
            </div>
        </div>
    )
}

export default LoadingCover
