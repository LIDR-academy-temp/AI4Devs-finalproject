import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { NavMenuGuard } from './NavMenuGuard'

vi.mock('../../features/navegacion/NavegacionContext', () => ({
  useNavegacion: vi.fn(),
}))

import { useNavegacion } from '../../features/navegacion/NavegacionContext'

const mockedUseNav = vi.mocked(useNavegacion)

/**
 * TC-NAV-03 — NavMenuGuard redirige a /403 si ruta no permitida por menú API.
 */
describe('TC-NAV-03 NavMenuGuard', () => {
  it('redirige a /403 cuando source=api y path no esta en allowedPaths', async () => {
    mockedUseNav.mockReturnValue({
      loading: false,
      source: 'api',
      groups: [],
      items: [],
      allowedPaths: ['/'],
      tree: [{ menuId: 1, titulo: 'Inicio', ruta: '/', icono: null, orden: 0, hijos: [] }],
      error: null,
      refetch: async () => {},
    })

    render(
      <MemoryRouter initialEntries={['/admin/tickets']}>
        <Routes>
          <Route element={<NavMenuGuard />}>
            <Route path="/admin/tickets" element={<p>Tickets admin</p>} />
          </Route>
          <Route path="/403" element={<p>Prohibido</p>} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Prohibido')).toBeInTheDocument()
    })
  })

  it('permite ruta listada en allowedPaths', () => {
    mockedUseNav.mockReturnValue({
      loading: false,
      source: 'api',
      groups: [],
      items: [],
      allowedPaths: ['/admin/tickets'],
      tree: [],
      error: null,
      refetch: async () => {},
    })

    render(
      <MemoryRouter initialEntries={['/admin/tickets']}>
        <Routes>
          <Route element={<NavMenuGuard />}>
            <Route path="/admin/tickets" element={<p>Tickets admin</p>} />
          </Route>
          <Route path="/403" element={<p>Prohibido</p>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Tickets admin')).toBeInTheDocument()
  })
})
