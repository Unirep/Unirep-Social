describe('visit and interact with home page', () => {
    const apiURL = `${Cypress.env('apiUrl')}`

    it('visit and interact with home page', () => {
        cy.intercept('GET', `${apiURL}/*`, {
            statusCode: 200,
            body: {
                data: {
                    id: '1',
                },
            },
        }).as('getApi')
        cy.intercept('POST', `http://localhost:8545*`, {
            statusCode: 200,
            body: {
                data: {
                    id: '1',
                },
            },
        }).as('post8545')
        cy.visit('/')
    })
})
