import { describe, expect, test, vi } from 'vitest'
import { ApiError, createApi } from './api'

const BASE = 'http://api.test/api/v1'
const REQUEST_ID = '4c525ed7-3bed-488d-8e51-9af0b1ba461c'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('createApi', () => {
  test('consulta la solicitud con X-Signing-Token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { id: REQUEST_ID, status: 'pending' }))
    const api = createApi(BASE, 'tok.en', fetchMock)

    const request = await api.getSignatureRequest(REQUEST_ID)

    expect(request).toEqual({ id: REQUEST_ID, status: 'pending' })
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/signature-requests/${REQUEST_ID}`, {
      headers: { 'X-Signing-Token': 'tok.en' },
    })
  })

  test('descarga el PDF con la misma credencial', async () => {
    const bytes = new Uint8Array([37, 80, 68, 70])
    const fetchMock = vi.fn().mockResolvedValue(new Response(bytes, { status: 200 }))
    const api = createApi(BASE, 'tok.en', fetchMock)

    const result = await api.downloadPdf('http://api.test/api/v1/documents/d/versions/1/download')

    expect(new Uint8Array(result)).toEqual(bytes)
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/v1/documents/d/versions/1/download', {
      headers: { 'X-Signing-Token': 'tok.en' },
    })
  })

  test.each([
    [401, 'expired_link'],
    [404, 'not_found'],
    [500, 'unavailable'],
    [503, 'unavailable'],
    [400, 'unavailable'],
  ] as const)('una respuesta %i se traduce a %s', async (status, kind) => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(status, { code: 'x', message: 'y' }))
    const api = createApi(BASE, 'tok.en', fetchMock)

    await expect(api.getSignatureRequest(REQUEST_ID)).rejects.toEqual(new ApiError(kind))
  })

  test('una falla de red se traduce a unavailable', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const api = createApi(BASE, 'tok.en', fetchMock)

    await expect(api.downloadPdf('http://api.test/x')).rejects.toEqual(new ApiError('unavailable'))
  })
})
