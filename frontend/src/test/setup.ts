import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { resetDb } from './msw/handlers'
import { server } from './msw/server'

// Any request without a handler fails the test: the screens may only call the endpoints they are meant to.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetDb()
  sessionStorage.clear()
})
afterAll(() => server.close())
