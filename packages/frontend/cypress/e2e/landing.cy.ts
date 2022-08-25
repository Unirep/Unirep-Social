import '@testing-library/cypress/add-commands'
import { ethers } from 'ethers'
import UnirepSocialABI from '@unirep-social/core/abi/UnirepSocial.json'

describe('Landing Page', () => {
    const serverUrl = Cypress.env('serverUrl')
    const ethProvider = Cypress.env('ethProvider')

    beforeEach(() => {
        // deploy unirep and unirep social contract
        cy.task('deployUnirep').then(
            ({ unirepAddress, unirepSocialAddress, wallet, provider }) => {
                cy.intercept('GET', `${serverUrl}/api/config`, {
                    body: {
                        unirepAddress,
                        unirepSocialAddress,
                    },
                }).as('getApiConfig')
            }
        )

        cy.intercept('GET', `${serverUrl}/api/post?*`, {
            body: [],
        }).as('getApiContent')
        cy.intercept('GET', `${serverUrl}/api/genInvitationCode/*`, {
            fixture: 'genInvitationCode.json',
        }).as('genInvitationCode')
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

// test sends a lot of requests when finished
