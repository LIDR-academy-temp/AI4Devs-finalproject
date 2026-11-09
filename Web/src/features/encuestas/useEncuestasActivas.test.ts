import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEncuestasActivas } from './useEncuestasActivas'

const apiGet = vi.fn()

vi.mock('../../shared/lib/apiClient', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
}))

describe('useEncuestasActivas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normaliza PascalCase del API', async () => {
    apiGet.mockResolvedValue({
      status: 200,
      data: [
        {
          EncuestaId: 7,
          Titulo: 'Asamblea',
          Descripcion: 'Orden del día',
          FechaInicio: '2026-10-01T00:00:00',
          FechaFin: '2026-12-31T00:00:00',
          Activa: true,
          YaParticipo: false,
        },
      ],
    })

    const { result } = renderHook(() => useEncuestasActivas())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(apiGet).toHaveBeenCalledWith('/ENC/Encuestas/activas')
    expect(result.current.encuestas).toEqual([
      {
        encuestaId: 7,
        titulo: 'Asamblea',
        descripcion: 'Orden del día',
        fechaInicio: '2026-10-01T00:00:00',
        fechaFin: '2026-12-31T00:00:00',
        activa: true,
        yaParticipo: false,
      },
    ])
  })
})
