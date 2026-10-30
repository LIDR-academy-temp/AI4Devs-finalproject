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
  aplicarMorasMorosos: vi.fn(),
  condonarMorasMorosos: vi.fn(),
  listCuentasAdmin: vi.fn(),
  listTiposCuentaAdmin: vi.fn(),
  listTiposMovimientoAdmin: vi.fn(),
  listPeriodosGeneradosAdmin: vi.fn(),
  listMovimientosAdmin: vi.fn(),
  getCuentasFnz: vi.fn(),
  generarCuotas: vi.fn(),
  registrarPago: vi.fn(),
}))
vi.mock('../features/admin/usuarios/usePadronUsuarios', () => ({
  usePadronUsuarios: () => ({ data: [{ usuarioId: 1, nombre: 'Test', correo: 't@local' }] }),
}))

import {
  getMorosos,
  listCuentasAdmin,
  listTiposCuentaAdmin,
  listTiposMovimientoAdmin,
  listPeriodosGeneradosAdmin,
  listMovimientosAdmin,
} from '../features/admin/finanzas/finanzasAdmin.api'

const mockGetMorosos = getMorosos as ReturnType<typeof vi.fn>
const mockListCuentasAdmin = listCuentasAdmin as ReturnType<typeof vi.fn>
const mockListTiposCuentaAdmin = listTiposCuentaAdmin as ReturnType<typeof vi.fn>
const mockListTiposMovimientoAdmin = listTiposMovimientoAdmin as ReturnType<typeof vi.fn>
const mockListPeriodosGeneradosAdmin = listPeriodosGeneradosAdmin as ReturnType<typeof vi.fn>
const mockListMovimientosAdmin = listMovimientosAdmin as ReturnType<typeof vi.fn>

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
  mockListCuentasAdmin.mockResolvedValue({ data: [], status: 200 })
  mockListTiposCuentaAdmin.mockResolvedValue({ data: [], status: 200 })
  mockListTiposMovimientoAdmin.mockResolvedValue({ data: [], status: 200 })
  mockListPeriodosGeneradosAdmin.mockResolvedValue({ data: [], status: 200 })
  mockListMovimientosAdmin.mockResolvedValue({ data: [], status: 200 })
})

describe('FinanzasAdminPage', () => {
  it('muestra pestaña cuotas por defecto', () => {
    renderPage()
    expect(screen.getByRole('tab', { name: 'Cuotas residente' })).toHaveClass('active')
    expect(screen.getByLabelText(/Residente/i)).toBeInTheDocument()
  })

  it('cambia a pestaña morosos', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: 'Morosos' }))
    expect(await screen.findByText('Aplicar filtro')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /moras por atraso/i })).toBeInTheDocument()
    expect(mockGetMorosos).toHaveBeenCalled()
  })

  it('muestra formulario generar período', () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: 'Generar período' }))
    expect(screen.getByRole('button', { name: /Generar cuotas del período/i })).toBeInTheDocument()
  })
})
