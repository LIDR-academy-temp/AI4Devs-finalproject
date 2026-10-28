import { describe, it, expect, vi, beforeEach } from 'vitest'
import '../test/stubToast'
import { render, screen, waitFor } from '@testing-library/react'
import { AdminVehiculosPage } from './AdminVehiculosPage'

vi.mock('../features/admin/vehiculos/useVehiculosAdmin', () => ({
  useVehiculosPadron: vi.fn(),
  buscarVehiculosPorPlacas: vi.fn(),
}))
vi.mock('../features/admin/usuarios/usePadronUsuarios', () => ({
  usePadronUsuarios: () => ({ data: [], loading: false, error: null, refetch: vi.fn() }),
}))
vi.mock('../features/admin/vehiculos/useVehiculosCatalog', () => ({
  useMarcasCatalog: () => ({
    marcas: [],
    loading: false,
    error: null,
    reload: vi.fn(),
  }),
  useModelosCatalog: () => ({
    modelos: [],
    loading: false,
    error: null,
    reload: vi.fn(),
  }),
}))

import { useVehiculosPadron } from '../features/admin/vehiculos/useVehiculosAdmin'

const mockPadron = vi.mocked(useVehiculosPadron)

const sample = [
  {
    automovilId: 1,
    usuarioId: 10,
    nombreUsuario: 'Ana López',
    placas: 'ABC-123',
    marca: 'Toyota',
    modelo: 'Corolla',
    numeroCasa: '42',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockPadron.mockReturnValue({
    vehiculos: sample,
    loading: false,
    error: null,
    refetch: vi.fn(),
  })
})

describe('AdminVehiculosPage', () => {
  it('muestra error de carga vía toast', async () => {
    const { useToast } = await import('../shared/toast/ToastContext')
    const toast = useToast()
    mockPadron.mockReturnValue({
      vehiculos: [],
      loading: false,
      error: 'Error al cargar vehículos',
      refetch: vi.fn(),
    })
    render(<AdminVehiculosPage />)
    expect(toast.error).toHaveBeenCalledWith('Error al cargar vehículos')
  })

  it('renderiza toolbar y placas del padrón', async () => {
    render(<AdminVehiculosPage />)
    await waitFor(() => {
      expect(screen.getAllByText('ABC-123').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Ana López').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('muestra botón nuevo vehículo', () => {
    render(<AdminVehiculosPage />)
    expect(screen.getByRole('button', { name: /nuevo vehículo/i })).toBeTruthy()
  })
})
