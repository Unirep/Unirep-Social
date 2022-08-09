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

    it('navigate to the signup page and signup a user', () => {
        cy.visit('/')
        cy.wait('@getApiConfig').then((res) => {
            cy.log(JSON.stringify(res))
        })
        cy.findByText('Join').click()
        cy.findByRole('textbox').type('test')
        cy.get('#close-icon').click()

        cy.findByText('Join').click()
        cy.findByRole('textbox').type('testprivatekey')
        cy.findByText('Let me in').click()
        cy.wait('@genInvitationCode').then((res: any) => {
            cy.log(JSON.stringify(res))
            assert.isNotNull(res.response.body, '1st API call has data')
        })
        cy.findByText('Download').click()
        
    })
})
