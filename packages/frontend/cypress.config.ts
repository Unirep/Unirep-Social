import { defineConfig } from 'cypress'

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:3000',
        viewportHeight: 900,
        viewportWidth: 1200,
        video: false,
    },
    env: {
        serverUrl: 'http://localhost:3001',
        ethProvider: 'http://localhost:8545',
    },
    chromeWebSecurity: false,
})
