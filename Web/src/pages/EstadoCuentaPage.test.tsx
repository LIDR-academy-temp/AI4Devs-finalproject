import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { EstadoCuentaPage } from './EstadoCuentaPage'

vi.mock('../features/finanzas/useEstadoCuenta', () => ({
  useEstadoCuenta: vi.fn(),
}))

import { useEstadoCuenta } from '../features/finanzas/useEstadoCuenta'

const mockUseEstadoCuenta = useEstadoCuenta as ReturnType<typeof vi.fn>

function renderPage() {
  return render(
    <MemoryRouter>
      <EstadoCuentaPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseEstadoCuenta.mockReturnValue({
    data: null,
    loading: false,
    error: null,
    refetch: vi.fn(),
  })
})

describe('EstadoCuentaPage', () => {
  it('muestra título y carga', () => {
    mockUseEstadoCuenta.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    })
    renderPage()
    expect(screen.getByText('Mi estado de cuenta')).toBeInTheDocument()
    expect(screen.getByText(/Cargando cuotas/i)).toBeInTheDocument()
  })

  it('muestra totales y tabla', () => {
    mockUseEstadoCuenta.mockReturnValue({
      data: {
        totalPendiente: 500,
        totalVencido: 200,
        cuotas: [
          {
            cuotaId: 1,
            monto: 500,
            montoPagado: 0,
            periodoInicio: '2026-10-01',
            periodoFin: '2026-10-31',
            fechaVencimiento: '2026-10-31',
            estado: 'Pendiente',
            esVencida: false,
          },
        ],
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
    renderPage()
    expect(screen.getByText('Total pendiente')).toBeInTheDocument()
    expect(screen.getByText('Total vencido')).toBeInTheDocument()
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/\$500\.00/).length).toBeGreaterThanOrEqual(1)
  })

  it('permite reintentar tras error', () => {
    const refetch = vi.fn()
    mockUseEstadoCuenta.mockReturnValue({
      data: null,
      loading: false,
      error: 'Fallo de red',
      refetch,
    })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(refetch).toHaveBeenCalled()
  })
})
