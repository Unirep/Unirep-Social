import { defineConfig } from 'cypress'

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:3000',
        viewportHeight: 900,
        viewportWidth: 1200,
        video: false,
    },
    env: {
        serverUrl: 'http://testurl.invalidtld',
        ethProvider: 'http://localhost:18545',
    },
    chromeWebSecurity: false,
    experimentalFetchPolyfill: true,
})
