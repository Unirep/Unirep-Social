import { defineConfig } from 'cypress'
import { startServer } from './cypress/support/e2e'

let deployed
export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:3000',
        viewportHeight: 900,
        viewportWidth: 1200,
        video: false,
        setupNodeEvents(on, config) {
            on('task', {
                deployUnirep() {
                    if (deployed) return deployed
                    deployed = startServer()
                    return deployed
                },
            })
        },
    },
    env: {
        serverUrl: 'http://testurl.invalidtld',
    },
    defaultCommandTimeout: 10000,
})
