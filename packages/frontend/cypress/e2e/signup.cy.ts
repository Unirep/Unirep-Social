import '@testing-library/cypress/add-commands'
import 'cypress-real-events/support'
import '../support/commands'
import { ethers } from 'ethers'
import UnirepSocialABI from '@unirep-social/core/abi/UnirepSocial.json'

const FUNDED_PRIVATE_KEY =
    '0x0000000000000000000000000000000000000000000000000000000000000001'
const GANACHE_URL = 'http://localhost:18545'

const provider = new ethers.providers.JsonRpcProvider(GANACHE_URL)

const wallet = new ethers.Wallet(FUNDED_PRIVATE_KEY, provider)

describe('visit and interact with home page', () => {
    const serverUrl = Cypress.env('serverUrl')

    beforeEach(() => {
        // deploy unirep and unirep social contract
        cy.task('deployUnirep').then(({ unirep, unirepSocial }) => {
            const unirepSocialContract = new ethers.Contract(
                unirepSocial.address,
                UnirepSocialABI,
                provider
            )
            cy.intercept('GET', `${serverUrl}/api/config`, {
                body: {
                    unirepAddress: unirep.address,
                    unirepSocialAddress: unirepSocial.address,
                },
            }).as('getApiConfig')
            cy.intercept(`${serverUrl}/api/signup?*`, async (req) => {
                const { commitment } = req.query
                const tx = await unirepSocialContract
                    .connect(wallet)
                    ['userSignUp(uint256)']('0x' + commitment.replace('0x', ''))
                req.reply({
                    epoch: 1,
                    transaction: tx.hash,
                })
            })
        })

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
            cy.findByRole('textbox').type(iden, {
                parseSpecialCharSequences: false,
            })
            cy.findByText('Submit').click()
            cy.findByText('Generate').click()
            // then check that the rep balance is accurate
        })
    })
})
