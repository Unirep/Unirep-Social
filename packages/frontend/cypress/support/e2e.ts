// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:

// import unirep social json abi
import UnirepSocial from '@unirep-social/core/artifacts/contracts/UnirepSocial.sol/UnirepSocial.json'

export async function startServer() {
    console.log('start server function in e2e')
    return {
        unirepSocialAddress: '0x7758F98C1c487E5653795470eEab6C4698bE541b',
        unirepAddress: '0xe69a847CD5BC0C9480adA0b339d7F0a8caC2B667',
        unirepSocialABI: UnirepSocial.abi,
        fundedKey:
            '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        hardhatUrl: 'http://127.0.0.1:18545',
    }
}
