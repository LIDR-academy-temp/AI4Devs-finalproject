import { onTestFinished } from 'vitest'
import { server } from './server'

/** Call inside a test. Records every request the fake API receives as `METHOD /path`, for assertions on what was (not) called. */
export function recordRequests() {
  const calls: string[] = []
  const listener = ({ request }: { request: Request }) => {
    calls.push(`${request.method} ${new URL(request.url).pathname}`)
  }
  server.events.on('request:start', listener)
  onTestFinished(() => {
    server.events.removeListener('request:start', listener)
  })
  return {
    calls,
    count: (call: string) => calls.filter((c) => c === call).length,
    protectedCalls: () => calls.filter((c) => !c.includes('/api/v1/auth/')),
    clear: () => calls.splice(0),
  }
}
