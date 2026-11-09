import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TrabajadorRoute } from './TrabajadorRoute'

vi.mock('../../features/auth/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('./AppShell', () => ({
  AppShell: () => <div data-testid="app-shell">shell</div>,
}))

import { useAuth } from '../../features/auth/AuthContext'

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>

describe('TC-NAV-05 TrabajadorRoute', () => {
  it('permite perfil Trabajador', () => {
    mockUseAuth.mockReturnValue({
      authReady: true,
      session: { token: 'jwt', perfil: 'Trabajador', requiereCambioPassword: false },
    })
    render(
      <MemoryRouter initialEntries={['/trabajador/tickets']}>
        <Routes>
          <Route element={<TrabajadorRoute />}>
            <Route path="/trabajador/tickets" element={<span>lista</span>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
  })

  it('redirige a 403 si no es Trabajador', () => {
    mockUseAuth.mockReturnValue({
      authReady: true,
      session: { token: 'jwt', perfil: 'Residente', requiereCambioPassword: false },
    })
    render(
      <MemoryRouter initialEntries={['/trabajador/tickets']}>
        <Routes>
          <Route path="/403" element={<span>forbidden</span>} />
          <Route element={<TrabajadorRoute />}>
            <Route path="/trabajador/tickets" element={<span>lista</span>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('forbidden')).toBeInTheDocument()
  })
})
