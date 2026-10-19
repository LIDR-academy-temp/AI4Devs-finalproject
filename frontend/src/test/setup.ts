import '@testing-library/jest-dom/vitest'
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer'
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

// jsdom's FormData, File and Blob cannot be streamed by Node's fetch (a multipart body never ends). The uploads
// use Node's own classes, the ones the fetch of the tests understands.
const NativeFormData = (
  await new Response('a=1', { headers: { 'content-type': 'application/x-www-form-urlencoded' } }).formData()
).constructor as typeof FormData
Object.assign(globalThis, { FormData: NativeFormData, File: NodeFile, Blob: NodeBlob })

// Radix Select asks for pointer capture and scrolls the chosen option into view; jsdom implements neither.
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

// jsdom does not implement scrolling; the router's scroll restoration calls it on every navigation.
window.scrollTo = () => {}

// Radix Checkbox measures its hidden input with ResizeObserver; jsdom implements none.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

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
