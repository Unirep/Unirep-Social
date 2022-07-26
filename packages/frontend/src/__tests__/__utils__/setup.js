// mocking fetch api
import 'whatwg-fetch'

// mock worker API
Object.defineProperty(window, 'Worker', { value: 'worker' })

import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
    rest.get('http://testurl.invalidtld/api/config', (req, res, ctx) => {
        return res(
            ctx.json({
                unirepAddress: '0x0000000000000000000000000000000000000000',
                unirepSocialAddress:
                    '0x0000000000000000000000000000000000000000',
            })
        )
    }),
    rest.get('http://testurl.invalidtld/*', (req, res, ctx) => {
        return res(ctx.json({}))
    }),
    rest.post('http://geth.testurl.invalidtld:8545/', (req, res, ctx) => {
        // a geth request
        const { method, params, id } = req.body
        if (method === 'eth_chainId') {
            return res(
                ctx.json({
                    id,
                    jsonrpc: '2.0',
                    result: '0x111111',
                })
            )
        }
        if (method === 'eth_call' && params[0]?.data === '0x79502c55') {
            // retrieving config from unirep
            return res(
                ctx.json({
                    id,
                    jsonrpc: '2.0',
                    result:
                        '0x' +
                        Array(10 * 64)
                            .fill(0)
                            .map((_, i) => (i % 64 === 63 ? 1 : 0))
                            .join(''),
                })
            )
        } else if (method === 'eth_call') {
            // other uint256 retrievals
            return res(
                ctx.json({
                    id,
                    jsonrpc: '2.0',
                    result: '0x0000000000000000000000000000000000000000000000000000000000000001',
                })
            )
        }
        return res(
            ctx.json({
                test: 'test',
            })
        )
    })
)
// pretty nasty fix
server.listen()

// beforeAll(() => {
//     // Establish requests interception layer before all tests.
//     server.listen()
// })

afterEach(() => {
    server.resetHandlers()
})

afterAll(() => {
    // Clean up after all tests are done, preventing this
    // interception layer from affecting irrelevant tests.
    server.close()
})
