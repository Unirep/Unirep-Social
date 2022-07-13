import {
    render,
    userEvent as user,
    screen,
    getByRole,
} from '../tests/test-utils'
import AppRouter from '../router'

// Is there a better solution than this?:  https://github.com/facebook/jest/issues/10784#:~:text=NODE_OPTIONS%3D%2D%2Dunhandled%2Drejections%3Dwarn%20yarn%20test


test('AppRouter component renders correct text', () => {
    render(<AppRouter />)

    screen.debug()
})
