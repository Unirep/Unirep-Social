import { useHistory } from 'react-router-dom'

const TopicsMenu = () => {
    const history = useHistory()

    const goToPhil = () => {
        history.push('/philosophy', { isConfirmed: true })
    }
    const goToTech = () => {
        history.push('/technology', { isConfirmed: true })
    }
    const goToPol = () => {}
    const goToMus = () => {}
    const goToBiz = () => {}
    const goToLit = () => {}
    const goToFit = () => {}
    const goToPho = () => {}
    const goToNews = () => {}

    return (
        <div className="topics-menu">
            <div className="topic-buttons">
                <div onClick={goToPhil}>Philosophy</div>
                <div onClick={goToTech}>Technology</div>
                <div>Politics</div>
                <div>Music</div>
                <div>Business</div>
                <div>Literature</div>
                <div>Fitness</div>
                <div>Photography</div>
                <div>News</div>
            </div>
        </div>
    )
}

export default TopicsMenu

//todo:  add pages for the route handlers to go to after I get posts to load!
