import { render, userEvent, screen } from '../tests/test-utils'
import AppRouter from '../router'

// Is there a better solution than this?:  https://github.com/facebook/jest/issues/10784#:~:text=NODE_OPTIONS%3D%2D%2Dunhandled%2Drejections%3Dwarn%20yarn%20test

// process.on('unhandledRejection', (reason, promise) => {
//   console.log('unhandledRejection', reason, promise);
// });
  

test('Renders AppRouter', () => {
  render(<AppRouter />)
})
