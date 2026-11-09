import '../test/stubToast'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AdminReportesPage } from './AdminReportesPage'

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({ session: { token: 'jwt' } }),
}))
vi.mock('../features/reportes/reportesAdmin.api', () => ({
  getBiTendencias: vi.fn().mockResolvedValue({ data: [] }),
  getMorososReporte: vi.fn().mockResolvedValue({ data: [] }),
  biExportUrl: () => '/bi',
  reporteFinanzasExportUrl: () => '/fnz',
  reporteTicketsExportUrl: () => '/tkt',
}))
vi.mock('../features/reportes/BiTrendsPanel', () => ({
  BiTrendsPanel: () => <div data-testid="bi-panel" />,
}))
vi.mock('../features/admin/finanzas/MorososTable', () => ({
  MorososTable: () => null,
}))
vi.mock('../shared/lib/accessTokenStore', () => ({
  getAccessToken: () => 'jwt',
}))

describe('AdminReportesPage', () => {
  it('renderiza encabezado Reportes', () => {
    render(
      <MemoryRouter>
        <AdminReportesPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Reportes' })).toBeInTheDocument()
  })
})
