import '@testing-library/cypress/add-commands'
import 'cypress-real-events/support'
import '../support/commands'
import { ethers } from 'ethers'
import UnirepSocialABI from '@unirep-social/core/abi/UnirepSocial.json'

describe('visit and interact with home page', () => {
    const serverUrl = Cypress.env('serverUrl')

    beforeEach(() => {
        // deploy unirep and unirep social contract
        cy.task('deployUnirep').then(
            ({
                unirepAddress,
                unirepSocialAddress,
                unirepSocialABI,
                ganacheUrl,
                fundedKey,
            }) => {
                const provider = new ethers.providers.JsonRpcProvider(
                    ganacheUrl
                )
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
                        ['userSignUp(uint256)'](
                            '0x' + commitment.replace('0x', '')
                        )
                    req.reply({
                        epoch: 1,
                        transaction: tx.hash,
                    })
                })
            }
        )

        cy.intercept('GET', `${serverUrl}/api/post?*`, {
            body: [],
        }).as('getApiContent')
        cy.intercept('GET', `${serverUrl}/api/genInvitationCode/*`, {
            fixture: 'genInvitationCode.json',
        }).as('genInvitationCode')
    })

    it('navigate to the signup page and signup a user', () => {
        cy.visit('/')
        cy.findByText('Join').click()
        cy.findByRole('textbox').type('invitationcode')
        cy.findByText('Let me in').click()
        cy.wait(2000)
        cy.findByRole('textbox').then((e) => {
            const iden = e[0].value
            cy.findByText('Download').click()
            cy.findByText('Copy').realClick()
            cy.get('textarea').type(iden, {
                parseSpecialCharSequences: false,
            })
            cy.findByText('Submit').click()
            cy.findByText('Generate').click()
            // then check that the rep balance is accurate
        })
    })
})
