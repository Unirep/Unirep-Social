import { defineConfig } from 'cypress' // might have to change this because of js

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:3000',
        viewportHeight: 900,
        viewportWidth: 1200,
        video: false,
    },
    env: {
        apiURL: 'http://localhost:3001',
        ethProvider: 'http://localhost:8545',
    },
})
