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

        cy.signupNewUser()
    })

    it('should signup a new user and confirm reputation', () => {
        cy.get('.link > img').should('exist')
        cy.get('#new > img').should('exist')
        cy.get('#user > img').should('exist')
        cy.get('.rep-info').contains('30')
    })
    it('new user should navigate to all pages', () => {
        cy.intercept('GET', 'http://testurl.invalidtld/api/records?*', {
            body: [],
        }).as('getApiRecords?')
        cy.intercept('GET', 'http://testurl.invalidtld/api/records/*', {
            body: [],
        }).as('getApiRecords')
        cy.intercept('GET', 'http://testurl.invalidtld/api/comment?*', {
            body: [],
        }).as('getApiComment')
        cy.get('.link > img').should('exist')
        cy.get('#new > img').click()
        cy.get('.link > img').click()
        cy.get('#user > img').click()
        cy.get('.link > img').click()
    })
})
