// A session against the real API, through the proxy of the app, for what the suite reads or cleans up outside the
// screens. Each seeded user signs in once, on first use, with SEED_PASSWORD; tokens live only in memory. An error
// carries the method, the path, the status and the code of the error, never what was sent.

export type SeededUser = 'analyst' | 'payments'

export interface ApiSession {
  get<T>(as: SeededUser, path: string): Promise<T>
  post<T>(as: SeededUser, path: string, body: unknown): Promise<T>
}

export function apiSession(baseUrl = 'http://localhost:5173/api/v1'): ApiSession {
  const tokens = new Map<SeededUser, string>()

  async function token(user: SeededUser): Promise<string> {
    const known = tokens.get(user)
    if (known) return known
    const password = process.env.SEED_PASSWORD
    if (!password) throw new Error('SEED_PASSWORD is not set')
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userName: user, password }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) throw new Error(`sign in of ${user} answered ${response.status}`)
    const { accessToken } = (await response.json()) as { accessToken: string }
    tokens.set(user, accessToken)
    return accessToken
  }

  async function call<T>(as: SeededUser, method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { authorization: `Bearer ${await token(as)}`, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) {
      const code = ((await response.json().catch(() => ({}))) as { code?: string }).code ?? ''
      throw new Error(`${method} ${path} answered ${response.status} ${code}`.trim())
    }
    return (await response.json()) as T
  }

  return {
    get: (as, path) => call(as, 'GET', path),
    post: (as, path, body) => call(as, 'POST', path, body),
  }
}
