import '@testing-library/cypress/add-commands'
import 'cypress-real-events/support'
import '../support/commands'

describe('sign up, log out, then sign in', () => {
    const serverUrl = Cypress.env('serverUrl')

    beforeEach(() => {
        // deploy unirep and unirep social contract
        cy.deployUnirep()

        cy.intercept('GET', `${serverUrl}/api/post?*`, {
            body: [],
        }).as('getApiContent')
    })

    it('should login without encryption', () => {
        cy.signupNewUser()
        cy.visit('/')
        cy.wait(3000) // wait for the synchronizer to get started
        cy.get('#menu').click()
        cy.findByText('Sign out').click()
        cy.findByText('Get started').click()
        cy.findByText('Sign In').click()
        cy.get('@iden').then((iden) => {
            cy.get('textarea').type(iden, {
                parseSpecialCharSequences: false,
            })
        })
        cy.get('#signin').click()
    })

    it('should login with encryption', () => {
        const password = 'imalongpasswordlookatme'
        cy.signupNewUser(password)
        cy.visit('/')
        cy.wait(3000) // wait for the synchronizer to get started
        cy.get('#menu').click()
        cy.findByText('Sign out').click()
        cy.findByText('Get started').click()
        cy.findByText('Sign In').click()
        cy.get('@iden').then((iden) => {
            cy.get('textarea').type(iden, {
                parseSpecialCharSequences: false,
            })
        })
        cy.get('#passwordInput').type(password)
        cy.get('#signin').click()
    })
})
