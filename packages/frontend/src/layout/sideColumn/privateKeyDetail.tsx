const PrivateKeyDetail = () => {
    return (
        <div className="widget private-key-detail">
            <h4>What’s the private key?</h4>
            <p>
                The private key in UniRep social is actually the Semaphore
                identity. Semaphore enable users online to be freely and fully
                anonymous. You can learn more about Semaphore{' '}
                <a href="https://semaphore.appliedzkp.org/" target="_blank">
                    here
                </a>
                .
            </p>

            <p>
                It’s essential that you save this in your devices & keep it
                safe. It’s required to used when signing in and no one else can
                help you to recover it.
            </p>
        </div>
    )
}

export default PrivateKeyDetail
