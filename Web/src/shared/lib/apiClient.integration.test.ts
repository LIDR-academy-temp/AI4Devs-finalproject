import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from './accessTokenStore'
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
} from './apiClient'

const refreshOnceMock = vi.fn<() => Promise<boolean>>()

vi.mock('./refreshSession', () => ({
  refreshOnce: () => refreshOnceMock(),
  setRefreshHandlers: vi.fn(),
}))

function responseOf(status: number, body = '{}') {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (status === 204 ? '' : body),
  }
}

function authFromCall(fetchMock: ReturnType<typeof vi.fn>, index = 0): string | undefined {
  const [, init] = fetchMock.mock.calls[index] as [string, RequestInit]
  const headers = init.headers as Record<string, string>
  return headers.Authorization
}

describe('apiClient — Authorization en todos los verbos', () => {
  beforeEach(() => {
    setAccessToken('jwt-test')
    refreshOnceMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setAccessToken(null)
  })

  async function expectBearerOnRequest(run: () => Promise<unknown>) {
    const fetchMock = vi.fn().mockResolvedValue(responseOf(200))
    vi.stubGlobal('fetch', fetchMock)
    await run()
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(authFromCall(fetchMock)).toBe('Bearer jwt-test')
  }

  it('GET envía Bearer desde el store', () => expectBearerOnRequest(() => apiGet('/SGR/Casas')))
  it('POST envía Bearer desde el store', () =>
    expectBearerOnRequest(() => apiPost('/SGR/Casas', { numero: '1' })))
  it('PUT envía Bearer desde el store', () =>
    expectBearerOnRequest(() => apiPut('/SGR/Casas/1', { numero: '2' })))
  it('PATCH envía Bearer desde el store', () =>
    expectBearerOnRequest(() => apiPatch('/SGR/Casas/1', { numero: '3' })))
  it('DELETE envía Bearer desde el store', () =>
    expectBearerOnRequest(() => apiDelete('/SGR/Casas/1')))

  it('GET no envía Authorization si no hay token', async () => {
    setAccessToken(null)
    const fetchMock = vi.fn().mockResolvedValue(responseOf(200))
    vi.stubGlobal('fetch', fetchMock)

    await apiGet('/public')

    expect(authFromCall(fetchMock)).toBeUndefined()
  })
})

describe('apiClient — retry 401 + refreshOnce', () => {
  beforeEach(() => {
    setAccessToken('jwt-expired')
    refreshOnceMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setAccessToken(null)
  })

  it('GET reintenta una vez tras 401 si refreshOnce devuelve true', async () => {
    refreshOnceMock.mockImplementation(async () => {
      setAccessToken('jwt-refreshed')
      return true
    })

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(responseOf(401))
      .mockResolvedValueOnce(responseOf(200, '{"ok":true}'))

    vi.stubGlobal('fetch', fetchMock)

    const result = await apiGet<{ ok: boolean }>('/SGR/Casas')

    expect(refreshOnceMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(authFromCall(fetchMock, 0)).toBe('Bearer jwt-expired')
    expect(authFromCall(fetchMock, 1)).toBe('Bearer jwt-refreshed')
    expect(result.status).toBe(200)
    expect(result.data?.ok).toBe(true)
  })

  it('POST no reintenta si refreshOnce devuelve false', async () => {
    refreshOnceMock.mockResolvedValue(false)
    const fetchMock = vi.fn().mockResolvedValue(responseOf(401, '{"title":"Unauthorized"}'))
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiPost('/SGR/Casas', { numero: '1' })

    expect(refreshOnceMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(result.status).toBe(401)
    expect(result.problem).toBeDefined()
  })

  it('apiDelete acepta 204 sin cuerpo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(responseOf(204))
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiDelete('/SGR/Casas/9')

    expect(result.status).toBe(204)
    expect(result.problem).toBeUndefined()
  })
})
