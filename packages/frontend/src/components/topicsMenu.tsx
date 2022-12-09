import React from 'react'

const TopicsMenu = () => {
    const goToPhil = () => {}
    const goToTech = () => {}
    const goToPol = () => {}
    const goToMus = () => {}
    const goToBiz = () => {}
    const goToLit = () => {}
    const goToFit = () => {}
    const goToPho = () => {}
    const goToNews = () => {}

    return (
        // todo: add userContext.userState logic
        <div className="topics-menu">
            {/* include logic for userState ? */}
            <div className="topic-buttons">
                <div onClick={goToPhil}>Philosophy</div>
                <div>Technology</div>
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
