describe('visit and interact with home page', () => {
    const serverUrl = `http://testurl.invalidtld`
    // pass the url of the localnode e.g. http://localhost:18545
    const ethProvider = `http://localhost:18545`

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
        cy.intercept(`${ethProvider}`, (req) => {
            // conditonal logic to return different responses based on the request url
            console.log(req.body)
            const { method, params, id } = req.body
            if (method === 'eth_chainId') {
                req.reply({
                    body: {
                        id: 1,
                        jsonrpc: '2.0',
                        result: '0x111111',
                    },
                })
            } else if (
                method === 'eth_call' &&
                params[0]?.data === '0x79502c55'
            ) {
                req.reply({
                    body: {
                        id,
                        jsonrpc: '2.0',
                        result:
                            '0x' +
                            Array(10 * 64)
                                .fill(0)
                                .map((_, i) => (i % 64 === 63 ? 1 : 0))
                                .join(''),
                    },
                })
            } else if (method === 'eth_call') {
                // other uint256 retrievals
                req.reply({
                    body: {
                        id,
                        jsonrpc: '2.0',
                        result: '0x0000000000000000000000000000000000000000000000000000000000000001',
                    },
                })
            } else {
                req.reply({
                    body: { test: 'test' },
                })
            }
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
        cy.findByText('Download').click()
    })
})
