import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'

vi.mock('../../features/navegacion/NavegacionContext', () => ({
  useNavegacion: () => ({
    loading: false,
    source: 'static' as const,
    groups: [],
    items: [],
    allowedPaths: [],
    tree: [],
    error: null,
    refetch: async () => {},
  }),
}))

vi.mock('../../features/notifications/NotificationBell', () => ({
  NotificationBell: () => null,
}))

vi.mock('../../features/auth/AuthContext', () => ({
  useAuth: () => ({
    session: { nombre: 'Test', perfil: 'Administrador', usuarioId: 1, correo: 't@t.com' },
    logout: vi.fn(),
  }),
}))

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<p>Contenido</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppShell layout', () => {
  it('usa flex push: aside con ancho fijo y main sin overlay', () => {
    renderShell()

    const main = screen.getByRole('main')
    expect(main).toHaveClass('flex-1')
    expect(main).not.toHaveClass('cq-main-under-sidebar')

    const aside = document.querySelector('.cq-app-sidebar-slot')
    expect(aside).toBeTruthy()
    expect(aside?.getAttribute('style')).toContain('3.25rem')
  })

  it('ensancha el aside al expandir el menú', async () => {
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole('button', { name: /expandir menú/i }))

    const aside = document.querySelector('.cq-app-sidebar-slot')
    expect(aside?.getAttribute('style')).toContain('12.5rem')
    expect(screen.getByRole('main')).toHaveClass('flex-1')
  })
})
