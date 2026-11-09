import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useNavegacionMenus } from './useNavegacionMenus'

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    session: { token: 't', usuarioId: 1, perfil: 'Administrador', nombre: 'A', expira: '', requiereCambioPassword: false },
  }),
}))

const mockGet = vi.fn()

vi.mock('./navegacion.api', () => ({
  fetchMenusNavegacion: () => mockGet(),
}))

describe('useNavegacionMenus', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it('usa API cuando hay nodos', async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          menuId: 1,
          titulo: 'Inicio',
          ruta: '/',
          icono: 'home',
          orden: 0,
          hijos: [],
        },
      ],
      status: 200,
    })
    const { result } = renderHook(() => useNavegacionMenus())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.source).toBe('api')
    expect(result.current.items.some((i) => i.path === '/')).toBe(true)
  })

  it('cae a estático si API vacía', async () => {
    mockGet.mockResolvedValue({ data: [], status: 200 })
    const { result } = renderHook(() => useNavegacionMenus())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.source).toBe('static')
    expect(result.current.items.length).toBeGreaterThan(0)
  })
})
