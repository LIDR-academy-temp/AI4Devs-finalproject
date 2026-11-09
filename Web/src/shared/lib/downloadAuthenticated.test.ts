import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setAccessToken } from './accessTokenStore'
import { downloadAuthenticated } from './downloadAuthenticated'

vi.mock('./refreshSession', () => ({
  refreshOnce: vi.fn(async () => false),
}))

describe('downloadAuthenticated', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('test-jwt')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setAccessToken(null)
  })

  it('envía Authorization Bearer desde accessTokenStore', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => new Blob(['x']),
    })

    const result = await downloadAuthenticated('/ARC/Archivos/1/descargar')
    expect(result.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/ARC/Archivos/1/descargar'),
      expect.objectContaining({
        credentials: 'include',
        headers: { Authorization: 'Bearer test-jwt' },
      }),
    )
  })

  it('devuelve error en respuesta no ok', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ detail: 'No encontrado' }),
    })

    const result = await downloadAuthenticated('/ARC/Archivos/99/descargar')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(404)
      expect(result.problem?.detail).toBe('No encontrado')
    }
  })
})
