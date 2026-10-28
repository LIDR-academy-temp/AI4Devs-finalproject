import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdminVisitasPage } from './AdminVisitasPage'
import * as apiClient from '../shared/lib/apiClient'

vi.mock('../features/visitas/useVisitas')
vi.mock('../features/admin/usuarios/usePadronUsuarios')
vi.mock('../shared/lib/apiClient')

import { useVisitas } from '../features/visitas/useVisitas'
import { usePadronUsuarios } from '../features/admin/usuarios/usePadronUsuarios'

const mockUseVisitas = vi.mocked(useVisitas)
const mockPadron = vi.mocked(usePadronUsuarios)

const mockVisitas = [
  {
    visitaId: 1,
    visitanteNombre: 'Juan Pérez',
    tipoIdentificacion: 'INE',
    numeroIdentificacion: '123456789',
    fechaEntrada: '2026-10-19T10:00:00Z',
    fechaSalida: undefined,
    autorizado: false,
    casaId: 1,
    numeroCasa: 'A-101',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockPadron.mockReturnValue({
    data: [{ usuarioId: 5, nombre: 'Ana', correo: 'ana@test.com', perfil: 'Residente', bActivo: true }],
    loading: false,
    error: null,
    refetch: vi.fn(),
  })
  mockUseVisitas.mockReturnValue({
    visitas: mockVisitas,
    loading: false,
    error: null,
    refetch: vi.fn(),
  })
})

describe('AdminVisitasPage', () => {
  it('muestra skeleton mientras carga', () => {
    mockUseVisitas.mockReturnValue({ visitas: [], loading: true, error: null, refetch: vi.fn() })
    render(<AdminVisitasPage />)
    expect(screen.getByLabelText('Cargando visitas')).toBeTruthy()
  })

  it('muestra la tabla con visitas', () => {
    render(<AdminVisitasPage />)
    expect(screen.getByText('Juan Pérez')).toBeTruthy()
  })

  it('abre panel al registrar entrada', () => {
    render(<AdminVisitasPage />)
    fireEvent.click(screen.getByRole('button', { name: /registrar entrada/i }))
    expect(document.getElementById('visita-nombre')).toBeTruthy()
  })

  it('llama apiPost con usuario visitado', async () => {
    const apiPostMock = vi.mocked(apiClient.apiPost).mockResolvedValue({ status: 201 })
    const refetch = vi.fn()
    mockUseVisitas.mockReturnValue({ visitas: [], loading: false, error: null, refetch })

    render(<AdminVisitasPage />)
    const toolbarBtn = screen.getAllByRole('button', { name: /registrar entrada/i })[0]
    fireEvent.click(toolbarBtn)
    fireEvent.change(document.getElementById('visita-nombre')!, { target: { value: 'Pedro Ruiz' } })
    fireEvent.change(document.getElementById('visita-num-id')!, { target: { value: 'ABC123' } })
    fireEvent.change(document.getElementById('visita-residente')!, { target: { value: '5' } })
    fireEvent.click(screen.getAllByRole('button', { name: /registrar entrada/i })[1])

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        '/VTS/Visitas',
        expect.objectContaining({ visitanteNombre: 'Pedro Ruiz', usuarioVisitadoId: 5 }),
      ),
    )
    expect(refetch).toHaveBeenCalled()
  })

  it('muestra estado vacío si no hay visitas', () => {
    mockUseVisitas.mockReturnValue({ visitas: [], loading: false, error: null, refetch: vi.fn() })
    render(<AdminVisitasPage />)
    expect(screen.getByText(/sin visitas/i)).toBeTruthy()
  })
})
