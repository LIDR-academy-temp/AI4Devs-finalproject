import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  crearAnuncio,
  eliminarAnuncio,
  useAnuncioDetalle,
  useAnunciosResidente,
} from './useAnuncios'

const apiGet = vi.fn()
const apiPatch = vi.fn()
const apiPost = vi.fn()
const apiDelete = vi.fn()

vi.mock('../../shared/lib/apiClient', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPatch: (...args: unknown[]) => apiPatch(...args),
  apiPost: (...args: unknown[]) => apiPost(...args),
  apiPut: vi.fn(),
  apiDelete: (...args: unknown[]) => apiDelete(...args),
}))

describe('useAnuncios — contrato API (CA-1..3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('CA-1: crearAnuncio llama POST /ANM/Anuncios', async () => {
    apiPost.mockResolvedValue({
      status: 201,
      data: { anuncioId: 9, titulo: 't', contenido: 'c', visto: false },
    })
    await crearAnuncio({ titulo: 't', contenido: 'c', tipoAnuncio: 'General' })
    expect(apiPost).toHaveBeenCalledWith('/ANM/Anuncios', {
      titulo: 't',
      contenido: 'c',
      tipoAnuncio: 'General',
    })
  })

  it('CA-2: detalle hace GET y PATCH visto', async () => {
    apiGet.mockResolvedValue({
      status: 200,
      data: {
        anuncioId: 3,
        titulo: 'A',
        contenido: 'B',
        fechaPublicacion: '2026-10-19T12:00:00Z',
        tipoAnuncio: 'General',
        visto: false,
      },
    })
    apiPatch.mockResolvedValue({ status: 204 })

    const { result } = renderHook(() => useAnuncioDetalle(3))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(apiGet).toHaveBeenCalledWith('/ANM/Anuncios/3')
    expect(apiPatch).toHaveBeenCalledWith('/ANM/Anuncios/3/visto', {})
    expect(result.current.error).toBeNull()
  })

  it('CA-3: eliminarAnuncio llama DELETE', async () => {
    apiDelete.mockResolvedValue({ status: 204 })
    await eliminarAnuncio(7)
    expect(apiDelete).toHaveBeenCalledWith('/ANM/Anuncios/7')
  })

  it('TC-ERR-1: PATCH visto fallido expone error', async () => {
    apiGet.mockResolvedValue({
      status: 200,
      data: {
        anuncioId: 3,
        titulo: 'A',
        contenido: 'B',
        fechaPublicacion: '2026-10-19T12:00:00Z',
        tipoAnuncio: 'General',
        visto: false,
      },
    })
    apiPatch.mockResolvedValue({ status: 500, problem: { detail: 'falló lectura' } })

    const { result } = renderHook(() => useAnuncioDetalle(3))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('falló lectura')
  })

  it('lista residente usa GET /ANM/Anuncios', async () => {
    apiGet.mockResolvedValue({ status: 200, data: [] })
    const { result } = renderHook(() => useAnunciosResidente())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(apiGet).toHaveBeenCalledWith('/ANM/Anuncios')
  })
})
