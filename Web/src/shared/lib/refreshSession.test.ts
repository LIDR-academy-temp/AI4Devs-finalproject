import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { refreshOnce, setRefreshHandlers } from './refreshSession'
import { getAccessToken, setAccessToken } from './accessTokenStore'

describe('refreshOnce', () => {
  beforeEach(() => {
    setAccessToken(null)
    setRefreshHandlers({})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('deduplica llamadas concurrentes a RefreshToken', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token: 'jwt-new',
        expira: new Date().toISOString(),
        perfil: 'Administrador',
        nombre: 'Admin',
        requiereCambioPassword: false,
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const [a, b, c] = await Promise.all([refreshOnce(), refreshOnce(), refreshOnce()])

    expect(a && b && c).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(getAccessToken()).toBe('jwt-new')
  })
})
