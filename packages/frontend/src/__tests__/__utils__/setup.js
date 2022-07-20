// mocking fetch api
import 'whatwg-fetch'

// mock worker API
Object.defineProperty(window, 'Worker', { value: 'worker' })
