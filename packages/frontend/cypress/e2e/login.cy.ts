describe('visit and interact with home page', () => {
    const serverUrl = `${Cypress.env('serverUrl')}`
    const ethProvider = `${Cypress.env('ethProvider')}`

    Cypress.on('uncaught:exception', (err, runnable) => {
        // returning false here prevents Cypress from
        // failing the test
        // note: uncaught errors are shown in Cypress GUI
        return false
    })

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
    })

    it('navigate to the login page and login a user', () => {
        cy.visit('/')
        cy.wait('@getApiConfig').then((res) => {
            cy.log(JSON.stringify(res))
        })
        // quickly tests if signup page loads
        cy.findByText('Sign in').click()
        cy.findByRole('textbox').type('test')
        cy.get('*[class^="login-page"]').should('be.visible')
        cy.get('#close-icon').click()

        cy.findByText('Sign in').click()
        cy.findByRole('textbox').type('testprivatekey')
        cy.get('*[class^="loading-btn"]').click()
        // Error: invalid contract address or ENS name (argument="addressOrName", value=undefined, code=INVALID_ARGUMENT, version=contracts/5.6.2) error thrown here
    })
})
