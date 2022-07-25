// mocking fetch api
import 'whatwg-fetch'

// mock worker API
Object.defineProperty(window, 'Worker', { value: 'worker' })

import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
    rest.get('https://testurl.invalidtld/*', (req, res, ctx) => {
        return res(
            ctx.json({
                test: 'test',
            })
        )
    }),
    rest.post('https://geth.testurl.invalidtld:8545/', (req, res, ctx) => {
        // a geth request
        return res(
            ctx.json({
                test: 'test',
            })
        )
    })
)

beforeAll(() => {
    // Establish requests interception layer before all tests.
    server.listen()
})

afterEach(() => {
    server.resetHandlers()
})

afterAll(() => {
    // Clean up after all tests are done, preventing this
    // interception layer from affecting irrelevant tests.
    server.close()
})
