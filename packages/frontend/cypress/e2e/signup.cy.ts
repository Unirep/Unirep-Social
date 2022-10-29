import '@testing-library/cypress/add-commands'
import 'cypress-real-events/support'
import '../support/commands'

describe('visit and interact with home page', () => {
    const serverUrl = Cypress.env('serverUrl')

    before(() => {
        // deploy unirep and unirep social contract
        cy.start()
        cy.intercept('GET', `${serverUrl}/api/post?*`, {
            body: [],
        }).as('getApiContent')
        cy.signupNewUser()
    })

    beforeEach(() => {
        cy.intercept('GET', `${serverUrl}/api/post?*`, {
            body: [],
        }).as('getApiContent')
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
    it('confirm reputation on home and user page', () => {
        cy.intercept('GET', 'http://testurl.invalidtld/api/records?*', {
            body: [],
        }).as('getApiRecords?')
        cy.intercept('GET', 'http://testurl.invalidtld/api/records/*', {
            body: [],
        }).as('getApiRecords')
        cy.intercept('GET', 'http://testurl.invalidtld/api/comment?*', {
            body: [],
        }).as('getApiComment')
        cy.location('pathname').should('eq', '/')
        cy.get('.rep-handout').contains('30')
        cy.get('#user > img').click()
        cy.location('pathname').should('eq', '/user')
        cy.get('.my-reps > .white-block').contains('0')
        cy.get('.user-info-widget > .rep-info').contains('0')
        cy.go('back')
    })
    it('ensures that user can submit a post', () => {
        // todo: find way to target title (might have to add id in UI)
        const loremPost =
            '*Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.*'
        cy.intercept('GET', 'http://testurl.invalidtld/api/records?*', {
            body: [],
        }).as('getApiRecords?')
        cy.intercept('GET', 'http://testurl.invalidtld/api/records/*', {
            body: [],
        }).as('getApiRecords')
        cy.intercept('GET', 'http://testurl.invalidtld/api/comment?*', {
            body: [],
        }).as('getApiComment')
        cy.get('#new > img').click()
        cy.location('pathname').should('eq', '/new')
        cy.get('.rep-handout').contains('30')
        cy.get('#inputTextArea').type(loremPost)
        cy.get('.button-border').contains('Preview').click({ force: true })
        cy.get('.block-content').should('exist')
        // submit post and check for reputation
        cy.get('.my-button').contains('Post - 5 points').click()
        cy.location('pathname').should('eq', '/')
    })
})
