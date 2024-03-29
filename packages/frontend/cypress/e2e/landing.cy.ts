import '@testing-library/cypress/add-commands'
import '../support/commands'

describe('Landing Page', () => {
    const serverUrl = Cypress.env('serverUrl')

    beforeEach(() => {
        // deploy unirep and unirep social contract
        cy.start()
        cy.intercept('GET', `${serverUrl}/api/post?*`, {
            body: [],
        }).as('getApiContent')
    })
    it('loads the landing page', () => {
        cy.visit('/')
        cy.get('*[class^="main-content"]').should('be.visible')
        cy.get('*[class^="banner"]').should('be.visible')
        cy.get('#getstarted').should('be.visible')
    })
    it('loads the start menu on click', () => {
        cy.get('#getstarted').click()
        cy.findByText('Sign up with Twitter').should('be.visible')
        cy.findByText('Sign up with Github').should('be.visible')
        cy.findByText('Sign In').should('be.visible')
    })
    it.skip('loads the burger menu on click', () => {
        cy.visit('/')
        cy.get('#menu').click()
        cy.get('*[class^="black-area"]').should('be.visible')
    })
    it.skip('progress list opens and closes', () => {
        cy.visit('/')
        cy.findByText('Detail').click()
        cy.get('*[class^="progress-list"]').should('be.visible')
        cy.findByText('Detail').click()
        cy.get('*[class^="progress-list"]').should('not.exist')
    })
})
