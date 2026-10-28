import '../test/stubToast'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FinanzasAdminPage } from './FinanzasAdminPage'

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({ session: { token: 'tok' } }),
}))
vi.mock('../features/admin/finanzas/finanzasAdmin.api', () => ({
  getCuotasUsuario: vi.fn(),
  getMorosos: vi.fn(),
  generarCuotas: vi.fn(),
  registrarPago: vi.fn(),
}))

import { getMorosos } from '../features/admin/finanzas/finanzasAdmin.api'

const mockGetMorosos = getMorosos as ReturnType<typeof vi.fn>

function renderPage() {
  return render(
    <MemoryRouter>
      <FinanzasAdminPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetMorosos.mockResolvedValue({ data: [], status: 200 })
})

describe('FinanzasAdminPage', () => {
  it('muestra título y pestaña cuotas por defecto', () => {
    renderPage()
    expect(screen.getByText('Finanzas (admin)')).toBeInTheDocument()
    expect(screen.getByLabelText(/Usuario ID/i)).toBeInTheDocument()
  })

  it('cambia a pestaña morosos', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: 'Morosos' }))
    expect(await screen.findByText('Aplicar filtro')).toBeInTheDocument()
    expect(mockGetMorosos).toHaveBeenCalled()
  })

  it('muestra formulario generar período', () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: 'Generar período' }))
    expect(screen.getByRole('button', { name: /Generar cuotas del período/i })).toBeInTheDocument()
  })
})
