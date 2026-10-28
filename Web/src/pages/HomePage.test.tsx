import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from './HomePage'

const mockUseDashboardResumen = vi.fn()

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({
    session: { token: 't', nombre: 'Test', perfil: 'Residente' },
    logout: vi.fn(),
  }),
}))

vi.mock('../features/dashboard/useDashboardResumen', () => ({
  useDashboardResumen: () => mockUseDashboardResumen(),
}))

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    mockUseDashboardResumen.mockReset()
    localStorage.setItem('cq-onboarding-v1', '1')
  })

  it('CA-1: muestra tarjetas admin cuando tipo ADMIN', () => {
    mockUseDashboardResumen.mockReturnValue({
      data: {
        tipo: 'ADMIN',
        ticketsNuevos: 4,
        ticketsEnSeguimiento: 2,
        morososMes: 1,
        montoCobrado: 1000,
        montoPendiente: 500,
        ocupacion: 87.5,
        ticketsPorCanal: { web: 5, telegram: 2 },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
    renderHome()
    expect(screen.getByText('Tickets nuevos')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.queryByText(/cuotas vencidas/i)).not.toBeInTheDocument()
  })

  it('CA-2: resumen residente con aviso vencida', () => {
    mockUseDashboardResumen.mockReturnValue({
      data: {
        tipo: 'RESIDENTE',
        ticketsActivos: 2,
        estadoCuotaMes: {
          monto: 800,
          fechaVencimiento: '2026-10-01',
          estado: 'Vencida',
        },
        notificacionesNoLeidas: 1,
        avisoVencida: true,
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
    renderHome()
    expect(screen.getByText(/cuotas vencidas/i)).toBeInTheDocument()
    expect(screen.getByText('Tickets activos')).toBeInTheDocument()
  })
})
