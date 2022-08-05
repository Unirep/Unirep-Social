describe('visit and interact with home page', () => {
    const apiURL = `${Cypress.env('apiURL')}`
    const ethProvider = `${Cypress.env('ethProvider')}`

    Cypress.on('uncaught:exception', (err, runnable) => {
        // returning false here prevents Cypress from
        // failing the test
        return false
    })

    it('visit and interact with home page', () => {
        cy.intercept('GET', `${apiURL}/api/*`, {
            body: {
                data: {
                    id: '1',
                },
                posts: {
                    content: 'test',
                },
            },
        }).as('getApi')
        cy.intercept('POST', `${ethProvider}*`, {
            body: {
                data: {
                    id: '1',
                },
            },
        }).as('ethProvider')
        cy.intercept(
            'GET',
            'http://localhost:3001/api/genInvitationCode/testprivatekey?',
            {
                body: {
                    data: {
                        id: '1',
                    },
                },
            }
        ).as('genInvitationCode')
        cy.visit('/')
        cy.findByText('Join').click()
        cy.findByRole('textbox').type('test')
        cy.get('#close-icon').click()

        cy.findByText('Join').click()
        cy.findByRole('textbox').type('testprivatekey')
        cy.findByText('Let me in').click()
        cy.wait('@genInvitationCode')
    })
})
