import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { session } from '@/lib/session/session'
import { resetDb } from './msw/handlers'
import { server } from './msw/server'

/**
 * jsdom has no Web Locks API. This double grants each named lock exclusively and in request order (FIFO), the
 * semantics of `navigator.locks.request(name, callback)` in its default `exclusive` mode, the only one the app uses.
 * One instance per test run plays the role of the origin's lock manager, shared by every simulated tab.
 */
class InMemoryLockManager {
  private readonly tails = new Map<string, Promise<unknown>>()

  request<T>(name: string, callback: (lock: { name: string; mode: 'exclusive' }) => T | Promise<T>): Promise<T> {
    const previous = this.tails.get(name) ?? Promise.resolve()
    const run = previous.then(() => callback({ name, mode: 'exclusive' }))
    this.tails.set(
      name,
      run.catch(() => undefined),
    )
    return run
  }
}

Object.defineProperty(navigator, 'locks', { value: new InMemoryLockManager(), configurable: true })

// jsdom does not implement scrolling; the router's scroll restoration calls it on every navigation.
window.scrollTo = () => {}

// Any request without a handler fails the test: the screens may only call the endpoints they are meant to.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetDb()
  session.clear()
  localStorage.clear()
  sessionStorage.clear()
})
afterAll(() => server.close())
