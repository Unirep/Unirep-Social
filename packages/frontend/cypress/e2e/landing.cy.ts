describe('Landing Page', () => {
    const serverUrl = Cypress.env('serverUrl')
    const ethProvider = Cypress.env('ethProvider')

    beforeEach(() => {
        cy.intercept('GET', `${serverUrl}/api/post?*`, {
            body: {
                posts: 'string',
            },
        }).as('getApiContent')
        cy.intercept('GET', `${serverUrl}/api/config`, {
            statusCode: 200,
            body: {
                test: 'string',
            },
        }).as('getApiConfig')
        cy.intercept('POST', `${ethProvider}*`, {
            statusCode: 200,
            fixture: 'ethProvider.json',
        }).as('ethProvider')
        cy.intercept('GET', `${serverUrl}/api/genInvitationCode/*`, {
            fixture: 'genInvitationCode.json',
        }).as('genInvitationCode')
        // intercepts come before visits
        cy.visit('/')
    })
    it('loads the landing page', () => {
        cy.get('*[class^="main-content"]').should('be.visible')
        cy.get('*[class^="banner"]').should('be.visible')
        cy.get('#join').should('be.visible')
        cy.get('#login').should('be.visible')
    })
    it('loads the burger menu on click', () => {
        cy.get('#menu').click()
        cy.get('*[class^="black-area"]').should('be.visible')
    })
    it('progress list opens and closes', () => {
        cy.findByText('Detail').click()
        cy.get('*[class^="progress-list"]').should('be.visible')
        cy.findByText('Detail').click()
        cy.get('*[class^="progress-list"]').should('not.exist')
    })
})

// test sends a lot of requests when finished
