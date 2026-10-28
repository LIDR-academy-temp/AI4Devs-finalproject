import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../features/notifications/NotificationBell', () => ({
  NotificationBell: () => null,
}))

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '[]',
      json: async () => [],
    }),
  )
})
import { AuthProvider } from '../../features/auth/AuthContext'
import { NavegacionProvider } from '../../features/navegacion/NavegacionContext'
import { PrivateRoute } from './PrivateRoute'

const session = {
  token: 'test-token',
  usuarioId: 1,
  expira: new Date().toISOString(),
  perfil: 'Residente',
  nombre: 'Test',
  requiereCambioPassword: false,
}

function renderRoutes(initialPath: string, withSession: boolean) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider initialSession={withSession ? session : null}>
        <NavegacionProvider>
          <Routes>
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<p>Privado</p>} />
            </Route>
          <Route path="/login" element={<p>Login</p>} />
          <Route path="/cambiar-password" element={<p>Cambiar</p>} />
          </Routes>
        </NavegacionProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('PrivateRoute', () => {
  it('redirige a /login sin sesión', async () => {
    renderRoutes('/', false)
    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument()
    })
  })

  it('muestra contenido protegido con sesión', () => {
    renderRoutes('/', true)
    expect(screen.getByText('Privado')).toBeInTheDocument()
  })

  it('redirige a cambiar-password si requiereCambioPassword', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider
          initialSession={{ ...session, requiereCambioPassword: true }}
        >
          <Routes>
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<p>Privado</p>} />
            </Route>
            <Route path="/cambiar-password" element={<p>Cambiar</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('Cambiar')).toBeInTheDocument()
  })
})
