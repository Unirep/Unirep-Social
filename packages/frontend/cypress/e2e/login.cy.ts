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
            body: {
                unirepAddress: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
                unirepSocialAddress:
                    '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
            },
        }).as('getApiConfig')
        cy.intercept('POST', `${ethProvider}*`, {
            fixture: 'ethProvider.json',
        }).as('ethProvider')
        cy.intercept('GET', `${serverUrl}/api/genInvitationCode/*`, {
            fixture: 'genInvitationCode.json',
        }).as('genInvitationCode')
    })

    it('navigate to the login page and login a user', () => {
        cy.visit('/')
        cy.wait('@getApiConfig').then((res: any) => {
            cy.log(JSON.stringify(res.response.body))
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
