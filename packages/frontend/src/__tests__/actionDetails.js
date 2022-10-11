import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ActionDetail from '../components/actionDetail'

const renderActionDetail = (
    showBorder,
    showHelp,
    showRep,
    maxHelp,
    defaultRep,
    hasRep,
    showoffRep,
    setShowoffRep,
    allEpks,
    useSubsidy,
    chooseToUseSubsidy,
    chooseToUsePersona,
    epkNonce,
    setEpkNonce
) => {
    render(
        <ActionDetail
            showBorder={showBorder}
            showHelp={showHelp}
            showRep={showRep}
            maxRep={maxRep}
            defaultRep={defaultRep}
            hasRep={hasRep}
            showoffRep={showoffRep}
            setShowoffRep={setShowoffRep}
            allEpks={allEpks}
            useSubsidy={useSubsidy}
            chooseToUseSubsidy={chooseToUseSubsidy}
            chooseToUsePersona={chooseToUsePersona}
            epkNonce={epkNonce}
            setEpkNonce={setEpkNonce}
        />
    )
}

let showBorder = true
let showHelp = true
let showRep = true
let maxRep = 30
let defaultRep = 15
let hasRep = 33
let showOffRep = 5
let setShowOffRep = jest.fn(showOffRep)
let allEpks = ['epk1', 'epk2', 'epk3']
let useSubsidy = true
let chooseToUseSubsidy = jest.fn()
let chooseToUsePersona = jest.fn()
let epkNonce = 7
let setEpkNonce = jest.fn(epkNonce)

test('should render actionDetail component with props', () => {
    renderActionDetail(
        showBorder,
        showHelp,
        showRep,
        maxRep,
        defaultRep,
        hasRep, // hasRep
        showOffRep,
        setShowOffRep,
        allEpks,
        useSubsidy,
        chooseToUseSubsidy,
        chooseToUsePersona,
        epkNonce,
        setEpkNonce
    )
    // hasRep >= defaultRep && useSubsidy
    // should only show first element of allEpks array on initial render
    expect(screen.getByText('epk1'))
    // render default values
    const inputs = screen.getAllByDisplayValue(5)
    // range input
    expect(inputs[0]).toHaveValue('5')
    // text input
    expect(inputs[1]).toHaveValue('5')

    // this text should not be in document because hasRep > defaultRep && useSubsidy is truthy
    expect(
        screen.queryByText(/you don't have any rep to use persona yet.../i)
    ).not.toBeInTheDocument()
})

test('trigger falsy useSubsidy', () => {
    renderActionDetail(
        showBorder,
        showHelp,
        showRep,
        maxRep,
        defaultRep,
        hasRep,
        showOffRep,
        setShowOffRep,
        allEpks,
        (useSubsidy = false),
        chooseToUseSubsidy,
        chooseToUsePersona,
        epkNonce,
        setEpkNonce
    )
    // hasRep >= defaultRep && !useSubsidy
    expect(
        screen.getByText('Personas') &&
            screen.getByText('Rep-Handout') &&
            screen.getByText('epk1') &&
            screen.getByText('epk2') &&
            screen.getByText('epk3')
    ).toBeInTheDocument()
})

test('trigger you have used all the Rep', () => {
    renderActionDetail(
        showBorder,
        showHelp,
        showRep,
        maxRep,
        defaultRep,
        (hasRep = 0), // hasRep
        showOffRep,
        setShowOffRep,
        allEpks,
        (useSubsidy = true),
        chooseToUseSubsidy,
        chooseToUsePersona,
        epkNonce,
        setEpkNonce
    )
    // hasRep < defaultRep && useSubsidy
    expect(screen.getByText('You have used all the Rep-Handout ;)'))
})

test('trigger low rep for persona', () => {
    renderActionDetail(
        showBorder,
        showHelp,
        showRep,
        maxRep,
        defaultRep,
        (hasRep = 0), // hasRep
        showOffRep,
        setShowOffRep,
        allEpks,
        (useSubsidy = false),
        chooseToUseSubsidy,
        chooseToUsePersona,
        epkNonce,
        setEpkNonce
    )
    // hasRep < defaultRep && !useSubsidy
    expect(screen.getByText('You don’t have any Rep to use persona yet....'))
})
