import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AdminVehiculosPage } from './AdminVehiculosPage'

vi.mock('../features/admin/vehiculos/useVehiculosAdmin', () => ({
  useVehiculosPadron: vi.fn(),
  buscarVehiculosPorPlacas: vi.fn(),
}))
vi.mock('../features/admin/usuarios/usePadronUsuarios', () => ({
  usePadronUsuarios: () => ({ data: [], loading: false, error: null, refetch: vi.fn() }),
}))
vi.mock('../features/vehiculos/useVehiculos', () => ({
  useMarcas: () => ({ marcas: [] }),
  useModelos: () => ({ modelos: [] }),
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
  it('renderiza toolbar y placas del padrón', async () => {
    render(<AdminVehiculosPage />)
    await waitFor(() => {
      expect(screen.getByText('ABC-123')).toBeTruthy()
      expect(screen.getByText('Ana López')).toBeTruthy()
    })
  })

  it('muestra botón nuevo vehículo', () => {
    render(<AdminVehiculosPage />)
    expect(screen.getByRole('button', { name: /nuevo vehículo/i })).toBeTruthy()
  })
})
