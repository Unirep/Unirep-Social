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
                const { commitment } = req.query
                const tx = await unirepSocial
                    .connect(wallet)
                    ['userSignUp(uint256)']('0x' + commitment.replace('0x', ''))
                req.reply({
                    epoch: 1,
                    transaction: tx.hash,
                })
            })
        }
    )
})

Cypress.Commands.add('signupNewUser', () => {
    cy.log('Signing up')

    cy.visit('/')
    cy.findByText('Join').click()
    cy.findByRole('textbox').type('invitationcode')
    cy.findByText('Let me in').click()
    cy.wait(3000)
    cy.findByRole('textbox').then((e) => {
        const iden = e[0].value
        cy.findByText('Download').click()
        cy.findByText('Copy').realClick()
        cy.get('textarea').type(iden, {
            parseSpecialCharSequences: false,
        })
        cy.findByText('Submit').click()
        cy.findByText('Generate').click()
    })
})

Cypress.Commands.add('airdrop', () => {
    cy.intercept(
        'GET',
        'http://testurl.invalidtld/build/proveUserSignUp.wasm',
        {
            body: [],
        }
    ).as('getProveUserSignUpWasm')
    cy.intercept(
        'GET',
        'http://testurl.invalidtld/build/proveUserSignUp.zkey',
        {
            body: [],
        }
    ).as('getProveUserSignUpZkey')
})

export {}
