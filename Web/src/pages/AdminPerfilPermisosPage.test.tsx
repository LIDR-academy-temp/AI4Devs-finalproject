import '../test/stubToast'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminPerfilPermisosPage } from './AdminPerfilPermisosPage'

vi.mock('../features/navegacion/navegacion.api', () => ({
  fetchPermisosMenus: vi.fn(),
  savePermisosMenus: vi.fn(),
}))

vi.mock('../features/navegacion/NavegacionContext', () => ({
  useNavegacion: () => ({ refetch: vi.fn() }),
}))

import { fetchPermisosMenus } from '../features/navegacion/navegacion.api'

const mockFetch = vi.mocked(fetchPermisosMenus)

function renderPage(perfilId = '3') {
  return render(
    <MemoryRouter initialEntries={[`/admin/perfiles/${perfilId}/permisos`]}>
      <Routes>
        <Route path="/admin/perfiles/:id/permisos" element={<AdminPerfilPermisosPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockResolvedValue({
    data: [{ menuId: 1, titulo: 'Inicio', asignado: true, visible: true }],
    status: 200,
  })
})

describe('AdminPerfilPermisosPage', () => {
  it('carga permisos y muestra menú', async () => {
    renderPage()
    await waitFor(() => expect(screen.getAllByText('Inicio').length).toBeGreaterThanOrEqual(1))
  })

  it('muestra error de carga vía toast', async () => {
    const { useToast } = await import('../shared/toast/ToastContext')
    const toast = useToast()
    mockFetch.mockResolvedValue({
      data: undefined,
      status: 500,
      problem: { detail: 'Error al cargar permisos' },
    })
    renderPage()
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Error al cargar permisos'))
  })
})
