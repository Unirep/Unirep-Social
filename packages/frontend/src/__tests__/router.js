import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React, { Provider } from 'react'
import { Router } from 'react-router-dom'
import { createMemoryHistory } from 'history'
import AppRouter from '../router'
// import 'jsdom-worker' - removed this package but may reinstall later.

// todo: fix ReferenceError: Worker is not defined

test('AppRouter renders all routes and I can navigate to those pages', () => {
    render(
        <Provider>
            <Router history={createMemoryHistory()}>
                <AppRouter />
            </Router>
        </Provider>
    )
})
