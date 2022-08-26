import '@testing-library/cypress/add-commands'

describe('Landing Page', () => {
    const serverUrl = Cypress.env('serverUrl')

    beforeEach(() => {
        // deploy unirep and unirep social contract
        cy.deployUnirep()
    })
    it('loads the landing page', () => {
        cy.visit('/')
        cy.get('*[class^="main-content"]').should('be.visible')
        cy.get('*[class^="banner"]').should('be.visible')
        cy.get('#join').should('be.visible')
        cy.get('#login').should('be.visible')
    })
    it('loads the burger menu on click', () => {
        cy.visit('/')
        cy.get('#menu').click()
        cy.get('*[class^="black-area"]').should('be.visible')
    })
    it('progress list opens and closes', () => {
        cy.visit('/')
        cy.findByText('Detail').click()
        cy.get('*[class^="progress-list"]').should('be.visible')
        cy.findByText('Detail').click()
        cy.get('*[class^="progress-list"]').should('not.exist')
    })
})
