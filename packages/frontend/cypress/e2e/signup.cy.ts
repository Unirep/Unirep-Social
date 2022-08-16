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
                unirepAddress: '0x41afd703a36b19D9BB94E3083baA5E4F70f5adD6',
                unirepSocialAddress:
                    '0x903Ae15BfbddFAD6cd44B4cC1CF01EEBa0742456',
            },
        }).as('getApiConfig')
        cy.intercept('/ethProvider', (req) => {
            // conditonal logic to return different responses based on the request url

            req.continue((res) => {
                if (req.body.method === 'eth_chainId') {
                    // return the chainId of the test network
                    return {
                        body: {
                            id: 1,
                            jsonrpc: '2.0',
                            result: '0x111111',
                        },
                    }
                }
                return {}
            })
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
        // quickly tests if signup page loads
        cy.findByText('Join').click()
        cy.findByRole('textbox').type('test')
        cy.get('*[class^="signup-page"]').should('be.visible')
        cy.get('#close-icon').click()

        cy.findByText('Join').click()
        cy.findByRole('textbox').type('testprivatekey')
        cy.findByText('Let me in').click()
        cy.wait('@genInvitationCode').then((res: any) => {
            cy.log(JSON.stringify(res))
            assert.isNotNull(res.response.body, '1st API call has data')
        })
        cy.findByText('Download').click()
        // Error: invalid contract address or ENS name (argument="addressOrName", value=undefined, code=INVALID_ARGUMENT, version=contracts/5.6.2) error thrown here
    })
})
