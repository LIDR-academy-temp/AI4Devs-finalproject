import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAreasComunes } from './useAreasComunes'
import { useReservaciones } from './useReservaciones'

const apiGet = vi.fn()

vi.mock('../../shared/lib/apiClient', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
}))

describe('useAreasComunes / useReservaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useAreasComunes asigna data del apiGet, no el objeto respuesta', async () => {
    apiGet.mockResolvedValue({
      status: 200,
      data: [{ areaComunId: 1, nombre: 'Salón', requiereReservacion: true }],
    })
    const { result } = renderHook(() => useAreasComunes())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(apiGet).toHaveBeenCalledWith('/VTS/AreasComunes')
    expect(result.current.areas).toHaveLength(1)
    expect(result.current.areas[0].nombre).toBe('Salón')
    expect(result.current.error).toBeNull()
  })

  it('useReservaciones expone error si apiGet falla', async () => {
    apiGet.mockResolvedValue({
      status: 500,
      problem: { detail: 'Servicio no disponible' },
    })
    const { result } = renderHook(() => useReservaciones())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.reservaciones).toEqual([])
    expect(result.current.error).toBe('Servicio no disponible')
  })
})
