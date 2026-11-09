import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCrearTicket } from './useCrearTicket'

const navigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}))

vi.mock('../../shared/lib/apiClient', () => ({
  apiPost: vi.fn(),
}))

import { apiPost } from '../../shared/lib/apiClient'

const mockApiPost = apiPost as ReturnType<typeof vi.fn>

describe('useCrearTicket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('TC-TKT-1: POST exitoso navega a /tickets', async () => {
    mockApiPost.mockResolvedValue({ status: 201, data: { ticketID: 1 } })

    const { result } = renderHook(() => useCrearTicket())

    await act(async () => {
      const out = await result.current.crear({
        titulo: 'Fuga',
        descripcion: 'En baño',
        categoria: 'Agua',
      })
      expect(out.ok).toBe(true)
    })

    expect(mockApiPost).toHaveBeenCalledWith('/TKT/Tickets', {
      titulo: 'Fuga',
      descripcion: 'En baño',
      categoria: 'Agua',
    })
    expect(navigate).toHaveBeenCalledWith('/tickets', { replace: true })
  })

  it('TC-ERR-TKT-1: error API devuelve mensaje', async () => {
    mockApiPost.mockResolvedValue({
      status: 400,
      problem: { detail: 'Título requerido', code: 'VALIDATION_ERROR' },
    })

    const { result } = renderHook(() => useCrearTicket())

    await act(async () => {
      const out = await result.current.crear({
        titulo: '',
        descripcion: 'x',
        categoria: 'Agua',
      })
      expect(out.ok).toBe(false)
      expect(out.errors?.[0]?.message).toBe('Título requerido')
    })
  })
})
