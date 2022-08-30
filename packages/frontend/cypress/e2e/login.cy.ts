import '@testing-library/cypress/add-commands'
import 'cypress-real-events/support'
import '../support/commands'

describe('visit and interact with home page', () => {
    const serverUrl = Cypress.env('serverUrl')

    beforeEach(() => {
        // deploy unirep and unirep social contract
        cy.deployUnirep()

        cy.intercept('GET', `${serverUrl}/api/post?*`, {
            body: [],
        }).as('getApiContent')
        cy.intercept('GET', `${serverUrl}/api/genInvitationCode/*`, {
            fixture: 'genInvitationCode.json',
        }).as('genInvitationCode')
    })

    it.skip('navigate to the login page and login a user', () => {
        cy.visit('/')
        cy.findByText('Sign in').click()
        cy.findByRole('textbox').type('testprivatekey')
        cy.get('*[class^="loading-btn"]').click()
    })
})
