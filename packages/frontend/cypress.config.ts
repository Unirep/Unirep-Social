import { defineConfig } from 'cypress'
import { startServer } from './cypress/support/e2e'

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:3000',
        viewportHeight: 900,
        viewportWidth: 1200,
        video: false,
        setupNodeEvents(on, config) {
            on('task', {
                deployUnirep() {
                    return startServer()
                },
            })
        },
    },
    env: {
        serverUrl: 'http://testurl.invalidtld',
    },
    // chromeWebSecurity: false,
    // experimentalFetchPolyfill: true,
})
