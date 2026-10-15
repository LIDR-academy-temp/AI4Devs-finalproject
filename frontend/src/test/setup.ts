import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { session } from '@/lib/session/session'
import { resetDb } from './msw/handlers'
import { server } from './msw/server'

// Any request without a handler fails the test: the screens may only call the endpoints they are meant to.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
// jsdom does not implement scrolling; the router's scroll restoration calls it on every navigation.
window.scrollTo = () => {}
afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetDb()
  session.clear()
  sessionStorage.clear()
})
afterAll(() => server.close())
