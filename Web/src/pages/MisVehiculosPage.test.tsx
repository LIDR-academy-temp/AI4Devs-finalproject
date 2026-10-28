import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MisVehiculosPage } from './MisVehiculosPage'

vi.mock('../features/vehiculos/useVehiculos', () => ({
  useVehiculos: vi.fn(),
  useMarcas: vi.fn(),
  useModelos: vi.fn(),
}))
vi.mock('../shared/lib/apiClient', () => ({
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}))

import { useVehiculos, useMarcas, useModelos } from '../features/vehiculos/useVehiculos'

const mockUseVehiculos = useVehiculos as ReturnType<typeof vi.fn>
const mockUseMarcas = useMarcas as ReturnType<typeof vi.fn>
const mockUseModelos = useModelos as ReturnType<typeof vi.fn>

const vehiculo = {
  automovilId: 1,
  marcaId: 1,
  modeloId: 1,
  marca: 'Toyota',
  modelo: 'Corolla',
  modeloLibre: null,
  placas: 'ABC-123',
  color: 'Blanco',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseMarcas.mockReturnValue({ marcas: [] })
  mockUseModelos.mockReturnValue({ modelos: [] })
  mockUseVehiculos.mockReturnValue({
    vehiculos: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  })
})

describe('MisVehiculosPage', () => {
  it('muestra estado vacío', () => {
    render(<MisVehiculosPage />)
    expect(screen.getByText('Mis vehículos')).toBeInTheDocument()
    expect(screen.getByText('No tienes vehículos registrados.')).toBeInTheDocument()
  })

  it('muestra vehículo en lista', () => {
    mockUseVehiculos.mockReturnValue({
      vehiculos: [vehiculo],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
    render(<MisVehiculosPage />)
    expect(screen.getByText('ABC-123')).toBeInTheDocument()
    expect(screen.getByText(/Toyota Corolla/)).toBeInTheDocument()
  })

  it('muestra error de carga vía toast', async () => {
    mockUseVehiculos.mockReturnValue({
      vehiculos: [],
      loading: false,
      error: 'No se pudieron cargar',
      refetch: vi.fn(),
    })
    render(<MisVehiculosPage />)
    const { useToast } = await import('../shared/toast/ToastContext')
    const toast = useToast()
    expect(toast.error).toHaveBeenCalledWith('No se pudieron cargar')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('abre modal al agregar', () => {
    render(<MisVehiculosPage />)
    fireEvent.click(screen.getByRole('button', { name: '+ Agregar vehículo' }))
    expect(screen.getByText('Agregar vehículo')).toBeInTheDocument()
  })
})
