import '../test/stubToast'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AreasYReservacionesPage } from './AreasYReservacionesPage'

vi.mock('../features/visitas/useAreasComunes', () => ({
  useAreasComunes: vi.fn(),
}))
vi.mock('../features/visitas/useReservaciones', () => ({
  useReservaciones: vi.fn(),
}))
vi.mock('../features/visitas/useReservacionesCalendario', () => ({
  useReservacionesCalendario: vi.fn(),
}))
vi.mock('../shared/lib/apiClient', () => ({
  apiPost: vi.fn(),
}))

import { useAreasComunes } from '../features/visitas/useAreasComunes'
import { useReservaciones } from '../features/visitas/useReservaciones'
import { useReservacionesCalendario } from '../features/visitas/useReservacionesCalendario'
import { apiPost } from '../shared/lib/apiClient'

const mockApiPost = apiPost as ReturnType<typeof vi.fn>

const mockUseAreas = useAreasComunes as ReturnType<typeof vi.fn>
const mockUseReservaciones = useReservaciones as ReturnType<typeof vi.fn>
const mockUseCalendario = useReservacionesCalendario as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAreas.mockReturnValue({ areas: [], loading: false, error: null })
  mockUseReservaciones.mockReturnValue({
    reservaciones: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  })
  mockUseCalendario.mockReturnValue({
    eventos: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  })
})

describe('AreasYReservacionesPage', () => {
  it('muestra título y sin áreas', () => {
    render(<AreasYReservacionesPage />)
    expect(screen.getByText('Áreas comunes y reservaciones')).toBeInTheDocument()
    expect(screen.getByText('No hay áreas comunes registradas.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Mis reservas' }))
    expect(screen.getByText('Sin reservaciones')).toBeInTheDocument()
  })

  it('muestra área con botón reservar', () => {
    mockUseAreas.mockReturnValue({
      areas: [
        {
          areaComunId: 1,
          nombre: 'Salón',
          descripcion: 'Salón de eventos',
          capacidad: 50,
          requiereReservacion: true,
        },
      ],
      loading: false,
    })
    render(<AreasYReservacionesPage />)
    expect(screen.getByRole('heading', { name: 'Salón' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reservar' }))
    expect(screen.getByText('Reservar: Salón')).toBeInTheDocument()
  })

  it('muestra reservación en tabla', () => {
    mockUseReservaciones.mockReturnValue({
      reservaciones: [
        {
          reservacionAreaId: 1,
          areaComunId: 1,
          areaComun: 'Alberca',
          fechaInicio: '2026-10-20T10:00:00Z',
          fechaFin: '2026-10-20T12:00:00Z',
          estado: 'Confirmada',
        },
      ],
      loading: false,
      refetch: vi.fn(),
    })
    render(<AreasYReservacionesPage />)
    fireEvent.click(screen.getByRole('tab', { name: 'Mis reservas' }))
    expect(screen.getByText('Alberca')).toBeInTheDocument()
    expect(screen.getByText('Confirmada')).toBeInTheDocument()
  })

  it('TC-VTS-C-3: calendario renderiza dos eventos', () => {
    vi.setSystemTime(new Date('2026-10-28T12:00:00'))
    mockUseAreas.mockReturnValue({
      areas: [
        {
          areaComunId: 1,
          nombre: 'Terraza',
          requiereReservacion: true,
        },
      ],
      loading: false,
      error: null,
    })
    mockUseCalendario.mockReturnValue({
      eventos: [
        {
          reservacionAreaId: 1,
          areaComunId: 1,
          fechaInicio: '2026-10-27T10:00:00',
          fechaFin: '2026-10-27T12:00:00',
          estado: 'Confirmada',
          etiqueta: 'Terraza (Reservado)',
        },
        {
          reservacionAreaId: 2,
          areaComunId: 1,
          fechaInicio: '2026-10-28T14:00:00',
          fechaFin: '2026-10-28T16:00:00',
          estado: 'Pendiente',
          etiqueta: 'Terraza (Reservado)',
        },
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
    render(<AreasYReservacionesPage />)
    expect(screen.getAllByTestId('calendario-evento').length).toBeGreaterThanOrEqual(2)
    vi.useRealTimers()
  })

  it('TC-ERR-RES-1: muestra error API al reservar', async () => {
    mockUseAreas.mockReturnValue({
      areas: [
        {
          areaComunId: 1,
          nombre: 'Terraza',
          requiereReservacion: true,
        },
      ],
      loading: false,
    })
    mockApiPost.mockResolvedValue({
      status: 409,
      problem: { detail: 'El área no está disponible en ese horario' },
    })

    render(<AreasYReservacionesPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Reservar' }))
    fireEvent.change(screen.getByLabelText(/inicio/i), { target: { value: '2026-11-01T10:00' } })
    fireEvent.change(screen.getByLabelText(/fin/i), { target: { value: '2026-11-01T12:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva' }))

    const { useToast } = await import('../shared/toast/ToastContext')
    const toast = useToast()
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('El área no está disponible en ese horario')
    })
  })

  it('TC-RES-1: reserva exitosa muestra toast y refetch', async () => {
    const refetch = vi.fn()
    mockUseAreas.mockReturnValue({
      areas: [
        {
          areaComunId: 2,
          nombre: 'Gimnasio',
          requiereReservacion: true,
        },
      ],
      loading: false,
    })
    mockUseReservaciones.mockReturnValue({
      reservaciones: [],
      loading: false,
      refetch,
    })
    mockApiPost.mockResolvedValue({
      status: 201,
      data: { reservacionAreaId: 99 },
    })

    render(<AreasYReservacionesPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Reservar' }))
    fireEvent.change(screen.getByLabelText(/inicio/i), { target: { value: '2026-11-01T10:00' } })
    fireEvent.change(screen.getByLabelText(/fin/i), { target: { value: '2026-11-01T12:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva' }))

    const { useToast } = await import('../shared/toast/ToastContext')
    const toast = useToast()
    expect(toast.success).toHaveBeenCalledWith('Reservación registrada correctamente.')
    expect(refetch).toHaveBeenCalled()
    expect(mockApiPost).toHaveBeenCalledWith(
      '/VTS/ReservacionesArea',
      expect.objectContaining({ areaComunId: 2 }),
    )
  })
})
