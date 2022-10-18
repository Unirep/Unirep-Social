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

        // private key setting page flow
        cy.get('#setting > img').click()
        cy.findByText('Reveal My Private Key').click()

        cy.get('.reveal-private-key > :nth-child(3)')
            .invoke('text')
            .as('privateKey')

        cy.get('#menu').click()
        cy.get('.style-check-box').click()
        cy.findByText('Sign out').click()
        cy.findByText('Get started').click()
        cy.findByText('Sign In').click()

        cy.get('@privateKey').then(($elText) => {
            cy.get('textarea').type($elText, {
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

        // private key setting page flow
        cy.get('#setting > img').click()
        cy.findByText('Reveal My Private Key').click()

        cy.get('.reveal-private-key > :nth-child(3)')
            .invoke('text')
            .as('privateKey')
        cy.get('#passwordInput').type(password)
        cy.get('#passwordConfirmInput').type(password)
        cy.findByText('Download').click()

        cy.get('#menu').click()
        cy.findByText('Sign out').click()
        cy.findByText('Get started').click()
        cy.findByText('Sign In').click()

        cy.get('@privateKey').then(($elText) => {
            cy.get('textarea').type($elText, {
                parseSpecialCharSequences: false,
            })
        })

        cy.get('#passwordInput').type(password)
        cy.get('#signin').click()
    })
})
