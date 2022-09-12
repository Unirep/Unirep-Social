/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
import '@testing-library/cypress/add-commands'
import 'cypress-real-events/support'
import { ethers } from 'ethers'
import UnirepSocialABI from '@unirep-social/core/abi/UnirepSocial.json'

// -- This is a parent command --
Cypress.Commands.add('deployUnirep', () => {
    const serverUrl = Cypress.env('serverUrl')
    cy.task('deployUnirep').then(
        ({
            unirepAddress,
            unirepSocialAddress,
            unirepSocialABI,
            ganacheUrl,
            fundedKey,
        }) => {
            const signupCode = 'test_signup_code'
            const provider = new ethers.providers.JsonRpcProvider(ganacheUrl)
            const wallet = new ethers.Wallet(fundedKey, provider)
            const unirepSocial = new ethers.Contract(
                unirepSocialAddress,
                unirepSocialABI,
                provider
            )
            cy.intercept('GET', `${serverUrl}/api/config`, {
                body: {
                    unirepAddress,
                    unirepSocialAddress,
                },
            }).as('getApiConfig')
            cy.intercept(`${serverUrl}/api/signup?*`, async (req) => {
                expect(req.query.signupCode === signupCode)
                const { commitment } = req.query
                const tx = await unirepSocial
                    .connect(wallet)
                    ['userSignUp(uint256)']('0x' + commitment.replace('0x', ''))
                req.reply({
                    epoch: 1,
                    transaction: tx.hash,
                })
            })
            cy.intercept(`${serverUrl}/api/oauth/twitter?*`, {
                statusCode: 301,
                headers: {
                    Location: `http://localhost:3000/start?signupCode=${signupCode}`,
                },
            })
        }
    )
})

Cypress.Commands.add('signupNewUser', (password) => {
    cy.visit('/')
    cy.findByText('Get started').click()
    cy.findByText('Sign Up').click()
    cy.findByText('Twitter').click()
    cy.wait(20000)
    if (!password) {
        cy.findByText('Skip this').click()
    } else {
        cy.get('#passwordInput').type(password)
        cy.get('#passwordConfirmInput').type(password)
        cy.findByText('Encrypt it').click()
    }

    // cy.findByText('Let me in').click()
    return cy
        .findByRole('textbox')
        .then((e) => {
            const iden = e[0].value
            cy.findByText('Download').click()
            cy.findByText('Copy').realClick()
            cy.get('textarea').type(iden, {
                parseSpecialCharSequences: false,
            })
            cy.findByText('Submit').click()
            cy.findByText('Get in').click()
            return Promise.resolve(iden)
        })
        .as('iden')
})

export {}
